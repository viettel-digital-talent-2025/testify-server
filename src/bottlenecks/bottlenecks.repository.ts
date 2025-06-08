import { AppLoggerService } from '@/shared/services/app-logger.service';
import { PrismaService } from '@/shared/services/prisma.service';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { BottleneckDto, BottleneckRunHistory } from './bottlenecks.dto';

@Injectable()
export class BottlenecksRepository {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly prisma: PrismaService,
  ) {
    this.logger.setContext(BottlenecksRepository.name);
  }

  async getBottlenecks(
    userId: string,
    scenarioId: string,
    runHistoryId: string,
    flowId?: string,
    stepId?: string,
  ): Promise<BottleneckDto[]> {
    try {
      return await this.prisma.bottleneck.findMany({
        where: {
          userId,
          runHistoryId,
          scenarioId,
          flowId,
          stepId,
        },
        orderBy: {
          timestamp: 'desc',
        },
        include: {
          user: { select: { id: true, email: true } },
          scenario: { select: { id: true, name: true } },
          flow: { select: { id: true, name: true } },
          step: { select: { id: true, name: true } },
        },
      });
    } catch (error) {
      this.logger.error('Error getting bottlenecks', error);
      throw new InternalServerErrorException('Error getting bottlenecks');
    }
  }

  async getBottlenecksRunHistory(userId: string) {
    try {
      const group = await this.prisma.bottleneck.groupBy({
        by: ['userId', 'runHistoryId', 'createdAt', 'severity'],
        where: { userId },
        orderBy: {
          createdAt: 'desc',
        },
        _count: {
          _all: true,
        },
      });

      // Group by runHistoryId to combine severity counts
      const groupedByRunHistory = group.reduce(
        (acc, item) => {
          const key = item.runHistoryId;
          if (!acc[key]) {
            acc[key] = {
              userId: item.userId,
              runHistoryId: item.runHistoryId,
              createdAt: item.createdAt,
              countTotal: 0,
              countLow: 0,
              countMedium: 0,
              countHigh: 0,
            };
          }

          acc[key].countTotal += item._count._all;
          switch (item.severity) {
            case 'LOW':
              acc[key].countLow += item._count._all;
              break;
            case 'MEDIUM':
              acc[key].countMedium += item._count._all;
              break;
            case 'HIGH':
              acc[key].countHigh += item._count._all;
              break;
          }
          return acc;
        },
        {} as Record<string, any>,
      );

      return await Promise.all(
        Object.values(groupedByRunHistory).map(async (item) => {
          const runHistory = await this.prisma.runHistory.findUnique({
            where: { id: item.runHistoryId },
            include: {
              scenario: {
                select: { id: true, name: true },
              },
            },
          });

          return {
            ...runHistory,
            countBottlenecks: item.countTotal,
            countLow: item.countLow,
            countMedium: item.countMedium,
            countHigh: item.countHigh,
          };
        }),
      );
    } catch (error) {
      this.logger.error('Error getting bottlenecks run history', error);
      throw new InternalServerErrorException(
        'Error getting bottlenecks run history',
      );
    }
  }

  async getBottlenecksByRunHistoryId(
    userId: string,
    runHistoryId: string,
  ): Promise<BottleneckRunHistory | null> {
    try {
      return await this.prisma.runHistory.findFirst({
        where: { id: runHistoryId, userId },
        include: {
          scenario: {
            include: {
              flows: {
                include: {
                  steps: {
                    include: {
                      bottlenecks: {
                        where: { runHistoryId },
                        orderBy: {
                          timestamp: 'desc',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
    } catch (error) {
      this.logger.error('Error getting bottlenecks by run history id', error);
      throw new InternalServerErrorException(
        'Error getting bottlenecks by run history id',
      );
    }
  }

  async update(
    id: string,
    data: {
      isRead?: boolean;
      alertAt?: Date;
      analysis?: string;
    },
  ) {
    try {
      return this.prisma.bottleneck.update({
        where: { id },
        data,
      });
    } catch (error) {
      this.logger.error('Error updating bottleneck', error);
      throw new InternalServerErrorException('Error updating bottleneck');
    }
  }

  async getBottlenecksCount(userId: string) {
    try {
      const bottlenecks = await this.prisma.bottleneck.groupBy({
        by: ['userId', 'severity'],
        where: { userId },
        _count: {
          _all: true,
        },
      });

      return bottlenecks.reduce(
        (acc, item) => {
          acc[item.severity] = item._count._all;
          return acc;
        },
        {} as Record<string, number>,
      );
    } catch (error) {
      this.logger.error('Error getting bottlenecks count', error);
      throw new InternalServerErrorException('Error getting bottlenecks count');
    }
  }
}
