import { BottlenecksRepository } from '@/bottlenecks/bottlenecks.repository';
import { ScenarioRepository } from '@/scenario/repositories/scenario.repository';
import { AppLoggerService } from '@/shared/services/app-logger.service';
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { MetricsQuery } from '../types/metrics.types';
import { InfluxDBService } from './influxdb.service';

@Injectable()
export class MetricsService {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly influxDBService: InfluxDBService,
    private readonly scenarioRepository: ScenarioRepository,
    private readonly bottlenecksRepository: BottlenecksRepository,
  ) {
    this.logger.setContext(MetricsService.name);
  }

  private isTagsObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private isString(value: unknown): value is string {
    return typeof value === 'string';
  }

  async getRunAt(runHistoryId: string) {
    return this.influxDBService.getRunAt(runHistoryId);
  }

  async getEndAt(runHistoryId: string) {
    return this.influxDBService.getEndAt(runHistoryId);
  }

  async getMetrics(query: MetricsQuery) {
    try {
      const { runHistoryId, scenarioId, userId, interval, runAt, endAt, tags } =
        query;

      // Check if scenario exists
      const scenario = await this.scenarioRepository.findOne({
        id: scenarioId,
        userId,
        runHistoryId,
      });

      // Check if scenario exists
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

      const [metrics, bottlenecks] = await Promise.all([
        // Query InfluxDB for metrics
        this.influxDBService.queryMetrics({
          runHistoryId:
            runHistoryId === 'undefined'
              ? scenario.runHistories[0]?.id
              : runHistoryId,
          interval,
          metrics: ['http_req_duration', 'http_reqs', 'errors'],
          tags: safeTags,
          runAt: runAt ? new Date(runAt) : scenario.runHistories[0]?.runAt,
          endAt: endAt ? new Date(endAt) : scenario.runHistories[0]?.endAt,
        }),
        // Query bottlenecks
        this.bottlenecksRepository.getBottlenecksByFlowIdAndStepId(
          userId,
          runHistoryId === 'undefined'
            ? scenario.runHistories[0]?.id
            : runHistoryId,
          safeTags?.flow_id,
          safeTags?.step_id,
        ),
      ]);

      // format metrics
      const latencyPoints = metrics[0]?.map((m) => ({
        timestamp: m.time.toISOString(),
        avg: m.mean ?? 0,
        p95: m.percentile_95 ?? 0,
      }));

      const throughputPoints = metrics[1]?.map((m) => ({
        timestamp: m.time.toISOString(),
        value: (m.value ?? 0) / 5,
      }));

      const errorRatePoints = metrics[2]?.map((m) => ({
        timestamp: m.time.toISOString(),
        value: m.value ?? 0,
      }));

      return {
        runHistoryId,
        scenarioId,
        scenarioName: scenario.name,
        interval,
        tags: safeTags,
        metrics: {
          latency: latencyPoints,
          throughput: throughputPoints,
          errorRate: errorRatePoints,
        },
        bottlenecks,
        status: scenario.runHistories[0]?.status,
        progress: scenario.runHistories[0]?.progress,
        lastUpdated: new Date().toISOString(),
        runAt: scenario.runHistories[0]?.runAt?.toISOString() || null,
        endAt: scenario.runHistories[0]?.endAt?.toISOString() || null,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get realtime metrics for scenario ${query.scenarioId}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );

      throw new InternalServerErrorException(
        `Failed to get realtime metrics for scenario ${query.scenarioId}`,
      );
    }
  }
}
