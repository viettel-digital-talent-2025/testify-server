import {
  CreateRunHistoryDto,
  RunHistoryWhereInput,
  RunHistoryWithScenarioAndMetrics,
  UpdateRunHistoryDto,
} from '@/run-history/dtos/run-history.dto';
import { AppLoggerService } from '@/shared/services/app-logger.service';
import { PrismaService } from '@/shared/services/prisma.service';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
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
    id: string,
  ): Promise<RunHistoryWithScenarioAndMetrics | null> {
    try {
      return await this.prisma.runHistory.findUnique({
        where: { id },
        include: {
          scenario: {
            include: {
              flows: {
                include: {
                  steps: true,
                },
              },
            },
          },
          runHistoryMetrics: {
            include: {
              flow: {
                select: {
                  id: true,
                  name: true,
                },
              },
              step: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to find run history: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Failed to find run history');
    }
  }

  async findMany(params: {
    where?: RunHistoryWhereInput;
    skip?: number;
    take?: number;
    orderBy?: { [key: string]: 'asc' | 'desc' };
  }): Promise<RunHistoryWithScenarioAndMetrics[]> {
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
          runHistoryMetrics: {
            include: {
              flow: {
                select: {
                  id: true,
                  name: true,
                },
              },
              step: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      };

      const results = (await this.prisma.runHistory.findMany(
        query,
      )) as RunHistoryWithScenarioAndMetrics[];

      // The results now include the scenario field from Prisma
      return results;
    } catch (error) {
      this.logger.error(
        `Failed to find run histories: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Failed to find run histories');
    }
  }

  async findRunningJobsByUserId({
    userId,
  }: {
    userId: string;
  }): Promise<RunHistory[]> {
    try {
      return await this.prisma.runHistory.findMany({
        where: {
          scenario: { userId },
          status: RunHistoryStatus.RUNNING,
        },
        orderBy: { runAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        `Failed to find running jobs by user id: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Failed to find running jobs by user id',
      );
    }
  }

  async findRunningJobsByScenarioId({
    scenarioId,
  }: {
    scenarioId: string;
  }): Promise<RunHistory[]> {
    try {
      return await this.prisma.runHistory.findMany({
        where: {
          scenarioId,
          status: RunHistoryStatus.RUNNING,
        },
        orderBy: { runAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        `Failed to find running jobs by scenario id: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Failed to find running jobs by scenario id',
      );
    }
  }

  async create(data: CreateRunHistoryDto): Promise<RunHistory> {
    try {
      return await this.prisma.runHistory.create({
        data,
      });
    } catch (error) {
      this.logger.error(
        `Failed to create run history: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Failed to create run history');
    }
  }

  async update(id: string, data: UpdateRunHistoryDto): Promise<RunHistory> {
    try {
      return await this.prisma.runHistory.update({
        where: { id },
        data,
      });
    } catch (error) {
      this.logger.error(
        `Failed to update run history ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        `Failed to update run history ${id}`,
      );
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
      throw new InternalServerErrorException('Failed to count run histories');
    }
  }
}
