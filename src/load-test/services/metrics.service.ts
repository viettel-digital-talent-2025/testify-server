import { LoadTestStatusEvent } from '@/load-test/types/load-test.types';
import {
  LatencyPoint,
  MetricsQuery,
  MetricsResponse,
  TimeSeriesPoint,
} from '@/load-test/types/metrics.types';
import { ScenarioRepository } from '@/scenario/repositories/scenario.repository';
import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RunHistoryStatus } from '@prisma/client';
import { Observable, Subject } from 'rxjs';
import { InfluxDBService } from './influxdb.service';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly logger = new Logger(MetricsService.name);
  private readonly statusSubjects = new Map<
    string,
    Subject<LoadTestStatusEvent>
  >();
  private readonly lastKnownStatus = new Map<string, LoadTestStatusEvent>();

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly influxDBService: InfluxDBService,
    private readonly scenarioRepository: ScenarioRepository,
  ) {}

  onModuleInit() {
    // Subscribe to load test events
    this.eventEmitter.on('load-test.started', (event: LoadTestStatusEvent) => {
      this.notifyLoadTestStatus(event);
    });

    this.eventEmitter.on(
      'load-test.completed',
      (event: LoadTestStatusEvent) => {
        this.notifyLoadTestStatus(event);
      },
    );
  }

  subscribeToLoadTestStatus(
    scenarioId: string,
  ): Observable<LoadTestStatusEvent> {
    let subject = this.statusSubjects.get(scenarioId);
    if (!subject) {
      subject = new Subject<LoadTestStatusEvent>();
      this.statusSubjects.set(scenarioId, subject);
    }
    return subject.asObservable();
  }

  private notifyLoadTestStatus(event: LoadTestStatusEvent) {
    const subject = this.statusSubjects.get(event.scenarioId);
    // Store the last known status
    this.lastKnownStatus.set(event.scenarioId, event);
    if (subject) {
      subject.next(event);
      // If the test is completed (SUCCESS, FAILED, or ABORTED), complete the subject
      if (event.status !== RunHistoryStatus.RUNNING) {
        subject.complete();
        this.statusSubjects.delete(event.scenarioId);
      }
    }
  }

  private isTagsObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private isString(value: unknown): value is string {
    return typeof value === 'string';
  }

  getCurrentStatus(scenarioId: string): {
    stream: Observable<LoadTestStatusEvent> | null;
    lastStatus: LoadTestStatusEvent | null;
  } {
    const status = this.statusSubjects.get(scenarioId);
    return {
      stream: status ? status.asObservable() : null,
      lastStatus: this.lastKnownStatus.get(scenarioId) || null,
    };
  }

  async getMetrics(query: MetricsQuery): Promise<MetricsResponse> {
    try {
      const {
        userId,
        scenarioId,
        runHistoryId,
        duration = '1m',
        interval = '5s',
        tags,
      } = query;

      // Check if scenario exists
      const scenario = await this.scenarioRepository.findOne(
        scenarioId,
        userId,
        runHistoryId,
      );

      if (!scenario) {
        throw new NotFoundException(`Scenario ${scenarioId} not found`);
      }

      // Create type-safe tags object using type guards
      const safeTags = this.isTagsObject(tags)
        ? {
            flow_id: this.isString(tags.flow_id) ? tags.flow_id : undefined,
            step_id: this.isString(tags.step_id) ? tags.step_id : undefined,
          }
        : undefined;

      // Query InfluxDB for metrics
      const metrics = await this.influxDBService.queryMetrics(
        {
          scenarioId,
          duration: duration.toString(), // Ensure duration is string
          interval,
          metrics: ['http_req_duration', 'http_reqs', 'errors'],
          tags: safeTags,
        },
        scenario.runHistories[0].runAt,
        scenario.runHistories[0]?.endAt,
      );

      // Get all unique timestamps
      const timestamps = Array.from(
        new Set(metrics.map((m) => m._time)),
      ).sort();

      // Initialize metrics arrays
      const latencyPoints: LatencyPoint[] = [];
      const throughputPoints: TimeSeriesPoint[] = [];
      const errorRatePoints: TimeSeriesPoint[] = [];

      // Process metrics for each timestamp
      for (const timestamp of timestamps) {
        const metricsAtTime = metrics.filter((m) => m._time === timestamp);

        // Calculate latency metrics
        const latencyMetric = metricsAtTime.find(
          (m) => m._measurement === 'http_req_duration',
        );
        if (
          latencyMetric?.mean !== undefined &&
          latencyMetric?.percentile_95 !== undefined
        ) {
          latencyPoints.push({
            timestamp,
            avg: latencyMetric.mean,
            p95: latencyMetric.percentile_95,
          });
        }

        // Calculate throughput
        const requestsMetric = metricsAtTime.find(
          (m) => m._measurement === 'http_reqs',
        );
        if (requestsMetric?._value !== undefined) {
          // Convert interval to seconds for throughput calculation
          const intervalSeconds = this.parseIntervalToSeconds(interval);
          throughputPoints.push({
            timestamp,
            value: requestsMetric._value / intervalSeconds,
          });
        }

        // Calculate error rate using cumulative values
        const errorsMetric = metricsAtTime.find(
          (m) => m._measurement === 'errors',
        );
        const requestsMetricForErrors = metricsAtTime.find(
          (m) => m._measurement === 'http_reqs',
        );

        if (
          errorsMetric?._value !== undefined &&
          requestsMetricForErrors?._value !== undefined
        ) {
          errorRatePoints.push({
            timestamp,
            value:
              requestsMetricForErrors._value > 0
                ? (errorsMetric._value / requestsMetricForErrors._value) * 100
                : 0,
          });
        }
      }

      // Ensure all arrays have the same length by filling missing points
      this.fillMissingPoints(latencyPoints, timestamps, { avg: 0, p95: 0 });
      this.fillMissingPoints(throughputPoints, timestamps, { value: 0 });
      this.fillMissingPoints(errorRatePoints, timestamps, { value: 0 });

      return {
        scenarioId,
        runHistoryId,
        scenarioName: scenario.name,
        duration,
        interval,
        tags: safeTags,
        metrics: {
          latency: latencyPoints,
          throughput: throughputPoints,
          errorRate: errorRatePoints,
        },
        lastUpdated: new Date().toISOString(),
        progress: scenario.runHistories[0].progress,
        runAt: scenario.runHistories[0].runAt.toISOString(),
        endAt: scenario.runHistories[0].endAt?.toISOString() || null,
      };
    } catch (error: unknown) {
      this.logger.error(
        `Failed to get realtime metrics for scenario ${query.scenarioId}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new NotFoundException(
        `Failed to get realtime metrics for scenario ${query.scenarioId}`,
      );
    }
  }

  private parseIntervalToSeconds(interval: string): number {
    const unit = interval.slice(-1);
    const value = parseInt(interval.slice(0, -1), 10);

    if (isNaN(value)) {
      throw new Error(`Invalid interval format: ${interval}`);
    }

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      default:
        throw new Error(`Unsupported interval unit: ${unit}`);
    }
  }

  private fillMissingPoints<T extends { timestamp: string }>(
    points: T[],
    timestamps: string[],
    defaultValue: Partial<T> = {},
  ): void {
    const existingTimestamps = new Set(points.map((p) => p.timestamp));

    for (const timestamp of timestamps) {
      if (!existingTimestamps.has(timestamp)) {
        points.push({
          timestamp,
          ...defaultValue,
        } as T);
      }
    }

    // Sort points by timestamp
    points.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }
}
