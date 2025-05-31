import {
  RunHistoryWhereInput,
  RunHistoryWhereUniqueInput,
  RunHistoryWithMetrics,
  RunHistoryWithScenario,
} from '@/run-history/run-history.dto';
import { AppLoggerService } from '@/shared/services/app-logger.service';
import { PrismaService } from '@/shared/services/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma, RunHistory, RunHistoryStatus } from '@prisma/client';

@Injectable()
export class RunHistoryRepository {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly prisma: PrismaService,
  ) {
    this.logger.setContext(RunHistoryRepository.name);
  }

  async findUnique(
    where: RunHistoryWhereUniqueInput,
  ): Promise<RunHistoryWithMetrics | null> {
    try {
      return await this.prisma.runHistory.findUnique({
        where,
        include: {
          scenario: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to find run history: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async findMany(params: {
    where?: RunHistoryWhereInput;
    skip?: number;
    take?: number;
    orderBy?: { [key: string]: 'asc' | 'desc' };
  }): Promise<RunHistoryWithMetrics[]> {
    try {
      const { where, skip, take, orderBy } = params;

      // Build the query
      const query: Prisma.RunHistoryFindManyArgs = {
        where,
        skip: skip ?? 0,
        take: take ?? 10,
        orderBy: orderBy ?? { createdAt: 'desc' },
        include: {
          scenario: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      };

      const results = (await this.prisma.runHistory.findMany(
        query,
      )) as RunHistoryWithScenario[];

      // The results now include the scenario field from Prisma
      return results;
    } catch (error) {
      this.logger.error(
        `Failed to find run histories: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async findRunningRunHistory(scenarioId: string): Promise<RunHistory | null> {
    return await this.prisma.runHistory.findFirst({
      where: {
        scenarioId,
        status: RunHistoryStatus.RUNNING,
      },
      orderBy: { runAt: 'desc' },
    });
  }

  async findRunningRunHistories(scenarioId: string): Promise<RunHistory[]> {
    return await this.prisma.runHistory.findMany({
      where: { scenarioId, status: RunHistoryStatus.RUNNING },
      orderBy: { runAt: 'desc' },
    });
  }

  async create(data: {
    scenarioId: string;
    runAt: Date;
    vus: number;
    duration: number;
    status: RunHistoryStatus;
    successRate: number;
    avgResponseTime: number;
    errorRate: number;
    requestsPerSecond: number;
  }): Promise<RunHistory> {
    return await this.prisma.runHistory.create({
      data,
    });
  }

  async update(
    id: string,
    data: {
      status?: RunHistoryStatus;
      progress?: number;
      avgResponseTime?: number;
      errorRate?: number;
      successRate?: number;
      requestsPerSecond?: number;
    },
  ): Promise<RunHistory> {
    try {
      return await this.prisma.runHistory.update({
        where: { id },
        data: {
          ...data,
          endAt:
            data.status !== RunHistoryStatus.RUNNING ? new Date() : undefined,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to update run history ${id}:`);
      throw error;
    }
  }

  async updateStatus(
    id: string,
    status: RunHistoryStatus,
  ): Promise<RunHistory> {
    return await this.prisma.runHistory.update({
      where: { id },
      data: { status },
    });
  }

  async delete(
    where: RunHistoryWhereUniqueInput,
  ): Promise<RunHistoryWithMetrics> {
    try {
      return await this.prisma.runHistory.delete({
        where,
        include: {
          scenario: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to delete run history: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async count(where?: RunHistoryWhereInput): Promise<number> {
    try {
      const query: Prisma.RunHistoryCountArgs = { where };
      return await this.prisma.runHistory.count(query);
    } catch (error) {
      this.logger.error(
        `Failed to count run histories: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
