import { SchedulerWithScenario } from '@/scheduler/scheduler.dto';
import { PrismaService } from '@/shared/services/prisma.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Scenario, Scheduler } from '@prisma/client';

@Injectable()
export class SchedulerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveSchedulers() {
    return this.prisma.scheduler.findMany({
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
  }

  async findUserSchedulers(userId: string): Promise<Scheduler[]> {
    return this.prisma.scheduler.findMany({
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
    return this.prisma.scenario.findFirst({
      where: {
        id: scenarioId,
        userId,
      },
    });
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
      return this.prisma.scheduler.create({
        data,
        include: {
          scenario: true,
        },
      });
    } catch {
      throw new BadRequestException('Failed to create scheduler');
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
      return this.prisma.scheduler.update({
        where: { id },
        data,
        include: {
          scenario: true,
        },
      });
    } catch {
      throw new BadRequestException('Failed to update scheduler');
    }
  }

  async updateStatus(id: string, status: boolean): Promise<Scheduler> {
    return this.prisma.scheduler.update({
      where: { id },
      data: { isActive: status },
    });
  }

  async delete(id: string): Promise<Scheduler> {
    try {
      return this.prisma.scheduler.delete({
        where: { id },
      });
    } catch {
      throw new BadRequestException('Failed to delete scheduler');
    }
  }
}
