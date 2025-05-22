import { Prisma } from '@prisma/client';
import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/shared/services/prisma.service';
import {
  CreateScenarioGroupDto,
  ScenarioGroupDto,
} from '../dtos/scenario-group.dto';

@Injectable()
export class ScenarioGroupRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll(userId: string): Promise<ScenarioGroupDto[]> {
    try {
      const scenarioGroups = await this.prismaService.scenarioGroup.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          description: true,
          color: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      return await Promise.all(
        scenarioGroups.map(async (group) => {
          const count = await this.prismaService.scenario.count({
            where: { groupId: group.id },
          });
          return { ...group, count };
        }),
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new ConflictException('Scenario not found');
      }
      throw error;
    }
  }

  async create(userId: string, data: CreateScenarioGroupDto) {
    try {
      return await this.prismaService.scenarioGroup.create({
        data: {
          ...data,
          user: {
            connect: {
              id: userId,
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new ConflictException('Failed to create scenario');
      }
      throw error;
    }
  }

  async update(id: string, data: Partial<CreateScenarioGroupDto>) {
    try {
      return await this.prismaService.scenarioGroup.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new ConflictException('Scenario not found');
      }
      throw error;
    }
  }

  async delete(id: string) {
    try {
      return await this.prismaService.scenarioGroup.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new ConflictException('Scenario not found');
      }
      throw error;
    }
  }
}
