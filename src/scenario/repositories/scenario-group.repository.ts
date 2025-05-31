import { CreateScenarioGroupDto } from '@/scenario/dtos/scenario-group.dto';
import { PrismaService } from '@/shared/services/prisma.service';
import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class ScenarioGroupRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll(userId: string) {
    try {
      return await this.prismaService.scenarioGroup.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          description: true,
          scenarios: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
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
