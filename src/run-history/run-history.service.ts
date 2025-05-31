import {
  RunHistoryQueryDto,
  RunHistoryWhereInput,
  RunHistoryWhereUniqueInput,
  RunHistoryWithMetrics,
} from '@/run-history/run-history.dto';
import { RunHistoryRepository } from '@/run-history/run-history.repository';
import { AppLoggerService } from '@/shared/services/app-logger.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { RunHistoryStatus } from '@prisma/client';

@Injectable()
export class RunHistoryService {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly repository: RunHistoryRepository,
  ) {
    this.logger.setContext(RunHistoryService.name);
  }

  isValidDate(value: any): value is Date {
    return value instanceof Date && !isNaN(value.getTime());
  }

  parseDate(input: unknown): Date | null {
    if (typeof input === 'string') {
      const date = new Date(input);
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  }

  private parseStatus(
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

  buildWhere(query: RunHistoryQueryDto, scenarioId: string) {
    const where: RunHistoryWhereInput = {};
    if (scenarioId && scenarioId !== 'undefined' && scenarioId !== 'null') {
      where.scenarioId = scenarioId;
    }

    if (query.search) {
      where.scenario = {
        name: {
          contains: query.search,
          mode: 'insensitive',
        },
      };
    }

    const statuses = this.parseStatus(query.status);
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

  buildPaging(query: RunHistoryQueryDto) {
    const { skip, take } = query;
    const orderBy =
      query.orderBy && query.order
        ? { [query.orderBy]: query.order }
        : undefined;
    return { skip, take, orderBy };
  }

  async findOne(
    where: RunHistoryWhereUniqueInput,
  ): Promise<RunHistoryWithMetrics> {
    const runHistory = await this.repository.findUnique(where);
    if (!runHistory) {
      throw new NotFoundException(`Run history not found with id: ${where.id}`);
    }
    return runHistory;
  }

  async findAll(params: {
    where?: RunHistoryWhereInput;
    skip?: number;
    take?: number;
    orderBy?: { [key: string]: 'asc' | 'desc' };
  }): Promise<{ data: RunHistoryWithMetrics[]; total: number }> {
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

  async delete(
    where: RunHistoryWhereUniqueInput,
  ): Promise<RunHistoryWithMetrics> {
    try {
      // Check if exists
      await this.findOne(where);

      return await this.repository.delete(where);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to delete run history: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
