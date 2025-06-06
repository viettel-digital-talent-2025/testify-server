import { ScenarioRepository } from '@/scenario/repositories/scenario.repository';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MetricsQuery } from '../types/metrics.types';
import { InfluxDBService } from './influxdb.service';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(
    private readonly influxDBService: InfluxDBService,
    private readonly scenarioRepository: ScenarioRepository,
  ) {}

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

      console.log(
        runHistoryId,
        scenarioId,
        userId,
        interval,
        runAt,
        endAt,
        tags,
      );

      // Check if scenario exists
      const scenario = await this.scenarioRepository.findOne({
        id: scenarioId,
        userId,
        runHistoryId,
      });

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
        runHistoryId:
          runHistoryId === 'undefined'
            ? scenario.runHistories[0]?.id
            : runHistoryId,
        interval,
        metrics: ['http_req_duration', 'http_reqs', 'errors'],
        tags: safeTags,
        runAt: runAt ? new Date(runAt) : scenario.runHistories[0]?.runAt,
        endAt: endAt ? new Date(endAt) : scenario.runHistories[0]?.endAt,
      });

      const latencyPoints = metrics[0].map((m) => ({
        timestamp: m.time.toISOString(),
        avg: m.mean ?? 0,
        p95: m.percentile_95 ?? 0,
      }));

      const throughputPoints = metrics[1].map((m) => ({
        timestamp: m.time.toISOString(),
        value: (m.value ?? 0) / 5,
      }));

      const errorRatePoints = metrics[2].map((m) => ({
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
        status: scenario.runHistories[0].status,
        progress: scenario.runHistories[0].progress,
        lastUpdated: new Date().toISOString(),
        runAt: scenario.runHistories[0].runAt?.toISOString() || null,
        endAt: scenario.runHistories[0].endAt?.toISOString() || null,
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
