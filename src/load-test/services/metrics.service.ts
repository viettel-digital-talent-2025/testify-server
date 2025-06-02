import { LoadTestStatusEvent } from '@/load-test/types/load-test.types';
import { MetricsQuery, MetricsResponse } from '@/load-test/types/metrics.types';
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
        interval = '1s',
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
      const metrics = await this.influxDBService.queryMetrics({
        scenarioId,
        duration: duration.toString(),
        interval,
        metrics: ['http_req_duration', 'http_reqs', 'errors'],
        tags: safeTags,
        runAt: scenario.runHistories[0]?.runAt,
        endAt: scenario.runHistories[0]?.endAt,
      });

      const latencyPoints = metrics[0].map((m) => ({
        timestamp: m.time.toISOString(),
        avg: m.mean ?? 0,
        p95: m.percentile_95 ?? 0,
      }));

      const throughputPoints = metrics[1].map((m) => ({
        timestamp: m.time.toISOString(),
        value: m.value,
      }));

      const errorRatePoints = metrics[2].map((m) => ({
        timestamp: m.time.toISOString(),
        value: m.value,
      }));

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
}
