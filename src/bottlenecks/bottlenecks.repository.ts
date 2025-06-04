import { PrismaService } from '@/shared/services/prisma.service';
import { Injectable } from '@nestjs/common';
import { BottleneckDto, BottleneckRunHistory } from './bottlenecks.dto';

@Injectable()
export class BottlenecksRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getBottlenecks(
    userId: string,
    scenarioId: string,
    runHistoryId: string,
    flowId?: string,
    stepId?: string,
  ): Promise<BottleneckDto[]> {
    return await this.prisma.bottleneck.findMany({
      where: {
        userId,
        scenarioId,
        runHistoryId,
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
  }

  async getBottlenecksRunHistory(userId: string) {
    const group = await this.prisma.bottleneck.groupBy({
      by: ['userId', 'runHistoryId', 'createdAt'],
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
      _count: {
        _all: true,
      },
    });

    return await Promise.all(
      group.map(async (item) => {
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
          countBottlenecks: item._count._all,
        };
      }),
    );
  }

  async getBottlenecksByRunHistoryId(
    runHistoryId: string,
    userId: string,
  ): Promise<BottleneckRunHistory | null> {
    return await this.prisma.runHistory.findFirst({
      where: { id: runHistoryId },
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
  }

  async update(
    id: string,
    data: {
      isRead?: boolean;
      alertAt?: Date;
      analysis?: string;
    },
  ) {
    return this.prisma.bottleneck.update({
      where: { id },
      data,
    });
  }
}
