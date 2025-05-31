import {
  CreateScenarioInput,
  ScenarioDto,
  UpdateFlowDto,
  UpdateScenarioInput,
} from '@/scenario/dtos/scenario.dto';
import { PrismaService } from '@/shared/services/prisma.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RunHistory, Scenario } from '@prisma/client';

@Injectable()
export class ScenarioRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll(userId: string): Promise<Scenario[]> {
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
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new ConflictException('Failed to fetch scenarios');
      }
      throw error;
    }
  }

  async findAllByGroupId(groupId: string, userId: string): Promise<Scenario[]> {
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
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new ConflictException('Failed to fetch scenarios');
      }
      throw error;
    }
  }

  async findOne(
    id: string,
    userId: string,
    runHistoryId?: string,
  ): Promise<ScenarioDto> {
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
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new ConflictException('Failed to fetch scenario');
      }
      throw error;
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
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new ConflictException('Failed to create scenario');
      }
      throw error;
    }
  }

  async updateMetadata(id: string, data: Partial<Scenario>): Promise<void> {
    await this.prismaService.scenario.update({
      where: { id },
      data,
    });
  }

  async syncFlows(scenarioId: string, flows: UpdateFlowDto[]): Promise<void> {
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

  async update(
    id: string,
    data: UpdateScenarioInput,
    userId: string,
  ): Promise<Scenario> {
    try {
      await this.findOne(id, userId);

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
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new ConflictException('Failed to update scenario');
      }
      throw error;
    }
  }

  async remove(id: string, userId: string): Promise<Scenario> {
    try {
      await this.findOne(id, userId);

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
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new ConflictException('Failed to delete scenario');
      }
      throw error;
    }
  }

  async getTestHistory(id: string): Promise<RunHistory[]> {
    try {
      return await this.prismaService.runHistory.findMany({
        where: { scenarioId: id },
        orderBy: { runAt: 'desc' },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new ConflictException('Failed to fetch test history');
      }
      throw error;
    }
  }
}
