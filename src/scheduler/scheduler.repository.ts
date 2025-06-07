import { SchedulerWithScenario } from '@/scheduler/scheduler.dto';
import { AppLoggerService } from '@/shared/services/app-logger.service';
import { PrismaService } from '@/shared/services/prisma.service';
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Scenario, Scheduler } from '@prisma/client';

@Injectable()
export class SchedulerRepository {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly prisma: PrismaService,
  ) {
    this.logger.setContext(SchedulerRepository.name);
  }

  async findActiveSchedulers() {
    try {
      return await this.prisma.scheduler.findMany({
        where: {
          isActive: true,
          timeEnd: {
            gt: new Date(),
          },
        },
        include: {
          scenario: true,
        },
      });
    } catch (error) {
      this.logger.error('Failed to find active schedulers', error);
      throw new InternalServerErrorException(
        'Failed to find active schedulers',
      );
    }
  }

  async findUserSchedulers(userId: string): Promise<Scheduler[]> {
    try {
      return await this.prisma.scheduler.findMany({
        where: {
          scenario: {
            userId,
          },
        },
        include: {
          scenario: true,
        },
        orderBy: {
          timeStart: 'desc',
        },
      });
    } catch (error) {
      this.logger.error('Failed to find user schedulers', error);
      throw new InternalServerErrorException('Failed to find user schedulers');
    }
  }

  async findUserSchedulerById(id: string, userId: string) {
    try {
      const scheduler = await this.prisma.scheduler.findFirst({
        where: { id, scenario: { userId } },
      });
      return scheduler ? scheduler : null;
    } catch {
      throw new NotFoundException('Scheduler not found');
    }
  }

  async findScenarioById(
    scenarioId: string,
    userId: string,
  ): Promise<Scenario | null> {
    try {
      return await this.prisma.scenario.findFirst({
        where: {
          id: scenarioId,
          userId,
        },
      });
    } catch (error) {
      this.logger.error('Failed to find scenario by id', error);
      throw new InternalServerErrorException('Failed to find scenario by id');
    }
  }

  async create(data: {
    scenarioId: string;
    timeStart?: Date;
    timeEnd?: Date;
    cronExpression: string;
    timezone: string;
    config: string;
  }): Promise<SchedulerWithScenario> {
    try {
      return await this.prisma.scheduler.create({
        data,
        include: {
          scenario: true,
        },
      });
    } catch (error) {
      this.logger.error('Failed to create scheduler', error);
      throw new InternalServerErrorException('Failed to create scheduler');
    }
  }

  async update(
    id: string,
    data: {
      scenarioId: string;
      timeStart?: Date;
      timeEnd?: Date;
      cronExpression: string;
      timezone: string;
      config: string;
    },
  ): Promise<SchedulerWithScenario> {
    try {
      return await this.prisma.scheduler.update({
        where: { id },
        data,
        include: {
          scenario: true,
        },
      });
    } catch (error) {
      this.logger.error('Failed to update scheduler', error);
      throw new InternalServerErrorException('Failed to update scheduler');
    }
  }

  async updateStatus(id: string, status: boolean): Promise<Scheduler> {
    try {
      return await this.prisma.scheduler.update({
        where: { id },
        data: { isActive: status },
      });
    } catch (error) {
      this.logger.error('Failed to update scheduler status', error);
      throw new InternalServerErrorException(
        'Failed to update scheduler status',
      );
    }
  }

  async delete(id: string): Promise<Scheduler> {
    try {
      return await this.prisma.scheduler.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error('Failed to delete scheduler', error);
      throw new InternalServerErrorException('Failed to delete scheduler');
    }
  }
}
