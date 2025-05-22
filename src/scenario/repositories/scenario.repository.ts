import { Prisma, Scenario, RunHistory } from '@prisma/client';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/shared/services/prisma.service';

type CreateScenarioInput = Prisma.ScenarioCreateInput;
type UpdateScenarioInput = Prisma.ScenarioUpdateInput;

@Injectable()
export class ScenarioRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll(userId: string): Promise<Scenario[]> {
    try {
      return await this.prismaService.scenario.findMany({
        where: { userId },
        include: {
          group: true,
          Flows: { include: { steps: true } },
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
          Flows: { include: { steps: true } },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new ConflictException('Failed to fetch scenarios');
      }
      throw error;
    }
  }

  async findOne(id: string, userId: string): Promise<Scenario> {
    try {
      const scenario = await this.prismaService.scenario.findFirst({
        where: { id, userId },
        include: {
          group: true,
          Flows: { include: { steps: true } },
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
          Flows: {
            include: {
              steps: true,
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
          Flows: {
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
          Flows: {
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
