import { CreateScenarioGroupDto } from '@/scenario/dtos/scenario-group.dto';
import { AppLoggerService } from '@/shared/services/app-logger.service';
import { PrismaService } from '@/shared/services/prisma.service';
import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class ScenarioGroupRepository {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly prismaService: PrismaService,
  ) {
    this.logger.setContext(ScenarioGroupRepository.name);
  }

  async findAll({ userId }: { userId: string }) {
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
      this.logger.error('Failed to find all scenario groups', error);
      throw new InternalServerErrorException(
        'Failed to find all scenario groups',
      );
    }
  }

  async create({
    userId,
    data,
  }: {
    userId: string;
    data: CreateScenarioGroupDto;
  }) {
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
      this.logger.error('Failed to create scenario group', error);
      throw new InternalServerErrorException('Failed to create scenario group');
    }
  }

  async update({
    id,
    data,
  }: {
    id: string;
    data: Partial<CreateScenarioGroupDto>;
  }) {
    try {
      return await this.prismaService.scenarioGroup.update({
        where: { id },
        data,
      });
    } catch (error) {
      this.logger.error('Failed to update scenario group', error);
      throw new InternalServerErrorException('Failed to update scenario group');
    }
  }

  async delete({ id }: { id: string }) {
    try {
      return await this.prismaService.scenarioGroup.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error('Failed to delete scenario group', error);
      throw new InternalServerErrorException('Failed to delete scenario group');
    }
  }
}
