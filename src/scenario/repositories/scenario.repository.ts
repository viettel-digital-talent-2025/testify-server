import {
  CreateScenarioInput,
  ScenarioDto,
  UpdateFlowDto,
  UpdateScenarioInput,
} from '@/scenario/dtos/scenario.dto';
import { AppLoggerService } from '@/shared/services/app-logger.service';
import { PrismaService } from '@/shared/services/prisma.service';
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { RunHistory, Scenario } from '@prisma/client';

@Injectable()
export class ScenarioRepository {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly prismaService: PrismaService,
  ) {
    this.logger.setContext(ScenarioRepository.name);
  }

  async findAll({ userId }: { userId: string }): Promise<Scenario[]> {
    try {
      return await this.prismaService.scenario.findMany({
        where: { userId },
        include: {
          group: true,
          flows: {
            include: {
              steps: {
                orderBy: {
                  order: 'asc',
                },
              },
            },
            orderBy: {
              order: 'asc',
            },
          },
        },
      });
    } catch (error) {
      this.logger.error('Failed to find all scenarios', error);
      throw new InternalServerErrorException('Failed to find all scenarios');
    }
  }

  async findAllByGroupId({
    groupId,
    userId,
  }: {
    groupId: string;
    userId: string;
  }): Promise<Scenario[]> {
    try {
      return await this.prismaService.scenario.findMany({
        where: { groupId: groupId === 'null' ? null : groupId, userId },
        include: {
          group: true,
          flows: {
            include: {
              steps: {
                orderBy: {
                  order: 'asc',
                },
              },
            },
            orderBy: {
              order: 'asc',
            },
          },
          runHistories: {
            orderBy: { runAt: 'desc' },
            take: 1,
            select: {
              status: true,
              runAt: true,
              endAt: true,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error('Failed to find all scenarios by group id', error);
      throw new InternalServerErrorException(
        'Failed to find all scenarios by group id',
      );
    }
  }

  async findOne({
    id,
    userId,
    runHistoryId,
  }: {
    id: string;
    userId: string;
    runHistoryId?: string;
  }): Promise<ScenarioDto> {
    try {
      const scenario = await this.prismaService.scenario.findFirst({
        where: { id, userId },
        include: {
          group: true,
          flows: {
            include: {
              steps: {
                orderBy: {
                  order: 'asc',
                },
              },
            },
            orderBy: {
              order: 'asc',
            },
          },
          runHistories: {
            where: {
              id: runHistoryId !== 'undefined' ? runHistoryId : undefined,
            },
            orderBy: {
              runAt: 'desc',
            },
            take: 1,
            select: {
              id: true,
              status: true,
              runAt: true,
              endAt: true,
              progress: true,
            },
          },
        },
      });

      if (!scenario) {
        throw new NotFoundException('Scenario not found');
      }

      return scenario;
    } catch (error) {
      this.logger.error('Failed to find one scenario', error);
      throw new InternalServerErrorException('Failed to find one scenario');
    }
  }

  async getCount({
    userId,
  }: {
    userId: string;
  }): Promise<Record<string, number>> {
    try {
      const count = await this.prismaService.scenario.groupBy({
        by: ['type'],
        where: { userId },
        _count: {
          _all: true,
        },
      });

      const countByType = count.reduce(
        (acc, item) => {
          acc[item.type] = item._count._all;
          return acc;
        },
        {} as Record<string, number>,
      );

      return countByType;
    } catch (error) {
      this.logger.error('Failed to get count of scenarios', error);
      throw new InternalServerErrorException(
        'Failed to get count of scenarios',
      );
    }
  }

  async create(data: CreateScenarioInput): Promise<Scenario> {
    try {
      return await this.prismaService.scenario.create({
        data,
        include: {
          flows: {
            include: {
              steps: {
                orderBy: {
                  order: 'asc',
                },
              },
            },
            orderBy: {
              order: 'asc',
            },
          },
          group: true,
        },
      });
    } catch (error) {
      this.logger.error('Failed to create scenario', error);
      throw new InternalServerErrorException('Failed to create scenario');
    }
  }

  async updateMetadata({
    id,
    data,
  }: {
    id: string;
    data: Partial<Scenario>;
  }): Promise<void> {
    await this.prismaService.scenario.update({
      where: { id },
      data,
    });
  }

  async syncFlows({
    scenarioId,
    flows,
  }: {
    scenarioId: string;
    flows: UpdateFlowDto[];
  }): Promise<void> {
    const newFlows = flows.filter((f) => !f.id);
    const updatedFlows = flows.filter((f) => f.id);

    const existingFlows = await this.prismaService.scenarioFlow.findMany({
      where: { scenarioId },
      select: {
        id: true,
        steps: { select: { id: true } },
      },
    });

    const existingFlowIds = existingFlows.map((f) => f.id);

    // Update existing flows
    const updateFlowPromises = updatedFlows.map(async (flow) => {
      await this.prismaService.scenarioFlow.update({
        where: { id: flow.id },
        data: {
          name: flow.name,
          description: flow.description,
          weight: flow.weight,
          order: flow.order,
          steps: {
            create: flow.steps
              .filter((s) => !s.id)
              .map((step) => ({
                name: step.name,
                description: step.description,
                type: step.type,
                config: step.config,
                order: step.order ?? 0,
              })),
            update: flow.steps
              .filter((s) => s.id)
              .map((step) => ({
                where: { id: step.id },
                data: {
                  name: step.name,
                  description: step.description,
                  type: step.type,
                  config: step.config,
                  order: step.order,
                },
              })),
            delete: existingFlows
              .filter((f) => f.id === flow.id)[0]
              .steps.filter((s) => !flow.steps.some((s2) => s2.id === s.id)),
          },
        },
      });
    });

    const createFlowPromises = newFlows.map((f, i) =>
      this.prismaService.scenarioFlow.create({
        data: {
          scenarioId,
          name: f.name,
          description: f.description,
          weight: f.weight,
          order: f.order ?? i,
          steps: {
            create: f.steps.map((s, j) => ({
              name: s.name,
              description: s.description,
              type: s.type,
              config: s.config,
              order: s.order ?? j,
            })),
          },
        },
      }),
    );

    await Promise.all([...updateFlowPromises, ...createFlowPromises]);

    const deletedFlowIds = existingFlowIds.filter(
      (id) => !flows.some((f) => f.id === id),
    );

    const deletedFlowSteps = existingFlows
      .filter((f) => deletedFlowIds.includes(f.id))
      .flatMap((f) => f.steps.map((s) => s.id));

    await this.prismaService.scenarioFlow.deleteMany({
      where: {
        scenarioId,
        id: { in: deletedFlowIds },
      },
    });

    await this.prismaService.scenarioFlowStep.deleteMany({
      where: {
        id: { in: deletedFlowSteps },
      },
    });
  }

  async update({
    id,
    data,
    userId,
  }: {
    id: string;
    data: UpdateScenarioInput;
    userId: string;
  }): Promise<Scenario> {
    try {
      await this.findOne({ id, userId });

      return await this.prismaService.scenario.update({
        where: { id },
        data,
        include: {
          flows: {
            include: {
              steps: true,
            },
            orderBy: {
              order: 'asc',
            },
          },
          group: true,
        },
      });
    } catch (error) {
      this.logger.error('Failed to update scenario', error);
      throw new InternalServerErrorException('Failed to update scenario');
    }
  }

  async remove({
    id,
    userId,
  }: {
    id: string;
    userId: string;
  }): Promise<Scenario> {
    try {
      await this.findOne({ id, userId });

      return await this.prismaService.scenario.delete({
        where: { id },
        include: {
          flows: {
            include: {
              steps: true,
            },
          },
          group: true,
        },
      });
    } catch (error) {
      this.logger.error('Failed to delete scenario', error);
      throw new InternalServerErrorException('Failed to delete scenario');
    }
  }

  async getTestHistory({ id }: { id: string }): Promise<RunHistory[]> {
    try {
      return await this.prismaService.runHistory.findMany({
        where: { scenarioId: id },
        orderBy: { runAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Failed to get test history', error);
      throw new InternalServerErrorException('Failed to get test history');
    }
  }
}
