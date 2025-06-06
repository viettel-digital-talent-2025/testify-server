import {
  RunHistoryQueryRequestDto,
  RunHistoryWhereInput,
  RunHistoryWithScenarioName,
} from '@/run-history/dtos/run-history.dto';
import { RunHistoryRepository } from '@/run-history/repositories/run-history.repository';
import { AppLoggerService } from '@/shared/services/app-logger.service';
import { Injectable } from '@nestjs/common';
import { RunHistoryStatus } from '@prisma/client';

@Injectable()
export class RunHistoryService {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly repository: RunHistoryRepository,
  ) {
    this.logger.setContext(RunHistoryService.name);
  }

  private isValidDate(value: any): value is Date {
    return value instanceof Date && !isNaN(value.getTime());
  }

  private parseDate(input: unknown): Date | null {
    if (typeof input === 'string') {
      const date = new Date(input);
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  }

  private parseStatuses(
    status: string | string[] | undefined,
  ): RunHistoryStatus[] | undefined {
    if (!status || status === '' || status === 'null') return undefined;

    const statusArray = Array.isArray(status) ? status : status.split(',');
    const validStatuses = statusArray
      .map((s) => s.trim().toUpperCase())
      .filter((s): s is RunHistoryStatus =>
        Object.values(RunHistoryStatus).includes(s as RunHistoryStatus),
      );

    return validStatuses.length > 0 ? validStatuses : undefined;
  }

  buildWhere(query: RunHistoryQueryRequestDto, scenarioId: string) {
    const where: RunHistoryWhereInput = {};

    if (scenarioId && scenarioId !== 'undefined' && scenarioId !== 'null') {
      where.scenarioId = scenarioId;
    }

    if (query.search && query.search !== 'undefined') {
      where.OR = [];
      const runAt = this.parseDate(query.search);
      if (this.isValidDate(runAt)) {
        const startOfDay = new Date(runAt);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(runAt);
        endOfDay.setHours(23, 59, 59, 999);

        where.OR.push({ runAt: { gte: startOfDay, lte: endOfDay } });
      }

      where.OR.push({ id: { contains: query.search, mode: 'insensitive' } });

      const numSearch = Number(query.search);
      if (!isNaN(numSearch)) {
        where.OR.push(
          { avgLatency: { equals: numSearch } },
          { p95Latency: { equals: numSearch } },
          { throughput: { equals: numSearch } },
          { errorRate: { equals: numSearch } },
        );
      }
    }

    const statuses = this.parseStatuses(query.status);
    if (statuses && statuses.length > 0) {
      where.status = { in: statuses };
    }

    const startTime = this.parseDate(query.startTime);
    const endTime = this.parseDate(query.endTime);
    if (startTime || endTime) {
      where.runAt = {};
      if (this.isValidDate(startTime)) {
        where.runAt.gte = startTime;
      }
      if (this.isValidDate(endTime)) {
        where.runAt.lte = endTime;
      }
    }

    return where;
  }

  buildPaging(query: RunHistoryQueryRequestDto) {
    const { skip, take } = query;
    const orderBy =
      query.orderBy && query.order
        ? { [query.orderBy]: query.order }
        : undefined;
    return { skip, take, orderBy };
  }

  async findAll(params: {
    where?: RunHistoryWhereInput;
    skip?: number;
    take?: number;
    orderBy?: { [key: string]: 'asc' | 'desc' };
  }): Promise<{ data: RunHistoryWithScenarioName[]; total: number }> {
    try {
      const [data, total] = await Promise.all([
        this.repository.findMany({ ...params, where: params.where }),
        this.repository.count(params.where),
      ]);

      return { data, total };
    } catch (error) {
      this.logger.error(
        `Failed to find run histories: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
