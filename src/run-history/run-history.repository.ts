import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/shared/services/prisma.service';
import {
  RunHistoryCreateInput,
  RunHistoryUpdateInput,
  RunHistoryWhereInput,
  RunHistoryWhereUniqueInput,
  RunHistoryWithMetrics,
} from './run-history.model';

@Injectable()
export class RunHistoryRepository {
  private readonly logger = new Logger(RunHistoryRepository.name);

  constructor(private prisma: PrismaService) {}

  async create(data: RunHistoryCreateInput): Promise<RunHistoryWithMetrics> {
    try {
      return await this.prisma.runHistory.create({
        data,
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
        `Failed to create run history: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
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
      return await this.prisma.runHistory.findMany({
        ...params,
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
        `Failed to find run histories: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async update(params: {
    where: RunHistoryWhereUniqueInput;
    data: RunHistoryUpdateInput;
  }): Promise<RunHistoryWithMetrics> {
    try {
      return await this.prisma.runHistory.update({
        ...params,
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
        `Failed to update run history: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
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
      return await this.prisma.runHistory.count({ where });
    } catch (error) {
      this.logger.error(
        `Failed to count run histories: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
