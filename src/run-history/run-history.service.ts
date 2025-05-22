import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { RunHistoryRepository } from './run-history.repository';
import {
  RunHistoryCreateInput,
  RunHistoryUpdateInput,
  RunHistoryWhereInput,
  RunHistoryWhereUniqueInput,
  RunHistoryWithMetrics,
} from './run-history.model';
import { RunHistoryStatus } from '@prisma/client';

@Injectable()
export class RunHistoryService {
  private readonly logger = new Logger(RunHistoryService.name);

  constructor(private repository: RunHistoryRepository) {}

  async create(data: RunHistoryCreateInput): Promise<RunHistoryWithMetrics> {
    try {
      return await this.repository.create(data);
    } catch (error) {
      this.logger.error(
        `Failed to create run history: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
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
        this.repository.findMany(params),
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

  async findByScenarioId(
    scenarioId: string,
    params: {
      skip?: number;
      take?: number;
      orderBy?: { [key: string]: 'asc' | 'desc' };
    },
  ): Promise<{ data: RunHistoryWithMetrics[]; total: number }> {
    return this.findAll({
      ...params,
      where: { scenarioId },
    });
  }

  async update(params: {
    where: RunHistoryWhereUniqueInput;
    data: RunHistoryUpdateInput;
  }): Promise<RunHistoryWithMetrics> {
    try {
      // Check if exists
      await this.findOne(params.where);

      return await this.repository.update(params);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to update run history: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

  async markAsSuccess(
    id: string,
    metrics: {
      successRate: number;
      avgResponseTime: number;
      errorRate: number;
      requestsPerSecond: number;
    },
  ): Promise<RunHistoryWithMetrics> {
    return this.update({
      where: { id },
      data: {
        ...metrics,
        status: RunHistoryStatus.SUCCESS,
      },
    });
  }

  async markAsFailed(
    id: string,
    metrics: {
      successRate: number;
      avgResponseTime: number;
      errorRate: number;
      requestsPerSecond: number;
    },
  ): Promise<RunHistoryWithMetrics> {
    return this.update({
      where: { id },
      data: {
        ...metrics,
        status: RunHistoryStatus.FAILED,
      },
    });
  }

  async markAsAborted(id: string): Promise<RunHistoryWithMetrics> {
    return this.update({
      where: { id },
      data: {
        status: RunHistoryStatus.ABORTED,
      },
    });
  }
}
