import { LoadTestsService } from '@/load-test/services/load-tests.service';
import {
  CreateSchedulerDto,
  CronConfig,
  SchedulerWithScenario,
  UpdateSchedulerDto,
} from '@/scheduler/scheduler.dto';
import { SchedulerRepository } from '@/scheduler/scheduler.repository';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Scheduler } from '@prisma/client';
import { CronJob } from 'cron';

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly loadTestsService: LoadTestsService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly schedulerRepository: SchedulerRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    const schedulers = await this.schedulerRepository.findActiveSchedulers();
    await Promise.all(
      schedulers.map((scheduler) => this.scheduleJob(scheduler)),
    );
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(
      Array.from(this.schedulerRegistry.getCronJobs().values()).map((job) =>
        job.stop(),
      ),
    );
  }

  private async handleStartJob(scheduler: SchedulerWithScenario) {
    const now = new Date();
    if (scheduler.timeEnd && now > scheduler.timeEnd) {
      await Promise.all([
        this.handleDeleteJob(scheduler.id),
        this.schedulerRepository.updateStatus(scheduler.id, false),
      ]);
      return;
    }

    try {
      await this.loadTestsService.runTest({
        scenarioId: scheduler.scenarioId,
        userId: scheduler.scenario.userId,
      });
      this.logger.log(
        `Scheduled test completed for scenario ${scheduler.scenarioId}`,
      );
    } catch (error) {
      this.logger.error(
        `Scheduled test failed for scenario ${scheduler.scenarioId}:`,
        error,
      );
    }
  }

  private async handleUpdateJob(scheduler: SchedulerWithScenario) {
    const job = this.schedulerRegistry.getCronJob(scheduler.id);
    if (job) {
      await job.stop();
      this.schedulerRegistry.deleteCronJob(scheduler.id);
    }
    this.scheduleJob(scheduler);
  }

  private async handleDeleteJob(id: string) {
    try {
      const job = this.schedulerRegistry.getCronJob(id);
      if (job) {
        await job.stop();
        this.schedulerRegistry.deleteCronJob(id);
      }
    } catch {}
  }

  private scheduleJob(scheduler: SchedulerWithScenario): void {
    try {
      const job = new CronJob(
        scheduler.cronExpression,
        async () => await this.handleStartJob(scheduler),
        null,
        true,
        scheduler.timezone || 'UTC',
      );

      this.schedulerRegistry.addCronJob(scheduler.id, job);
      job.start();
    } catch (error) {
      this.logger.error(
        `Failed to schedule job for scheduler ${scheduler.id}:`,
        error,
      );
      throw new BadRequestException('Invalid cron expression or timezone');
    }
  }

  private convertToCronExpression(config: CronConfig): string {
    switch (config.type) {
      case 'every_day': {
        const date = new Date(config.time as string);
        return `${date.getMinutes()} ${date.getHours()} * * *`;
      }
      case 'every_x_hours': {
        return `0 */${config.hours} * * *`;
      }
      case 'every_weekday': {
        const date = new Date(config.time as string);
        return `${date.getMinutes()} ${date.getHours()} * * 1-5`;
      }
      case 'every_weekend': {
        const date = new Date(config.time as string);
        return `${date.getMinutes()} ${date.getHours()} * * 0,6`;
      }
      case 'every_monday': {
        const date = new Date(config.time as string);
        return `${date.getMinutes()} ${date.getHours()} * * 1`;
      }
      case 'monthly_day': {
        const date = new Date(config.time as string);
        return `${date.getMinutes()} ${date.getHours()} ${config.day} * *`;
      }
      case 'once': {
        const date = new Date(config.date as string);
        return `${date.getMinutes()} ${date.getHours()} ${date.getDate()} ${date.getMonth() + 1} *`;
      }
      default:
        return '* * * * *';
    }
  }

  async findAll(userId: string): Promise<Scheduler[]> {
    const schedulers =
      await this.schedulerRepository.findUserSchedulers(userId);
    return schedulers.map((scheduler) => ({
      ...scheduler,
      config: JSON.parse(scheduler.config as string),
    }));
  }

  async create(
    createSchedulerDto: CreateSchedulerDto,
    userId: string,
  ): Promise<Scheduler> {
    const { timeStart, timeEnd } = createSchedulerDto;
    if (timeEnd && timeStart && timeStart >= timeEnd) {
      throw new BadRequestException('timeStart must be before timeEnd');
    }

    // Verify scenario ownership
    const { scenarioId } = createSchedulerDto;
    const scenario = await this.schedulerRepository.findScenarioById(
      scenarioId,
      userId,
    );

    if (!scenario) {
      throw new NotFoundException('Scenario not found or access denied');
    }

    try {
      const { timezone, config } = createSchedulerDto;
      const scheduler = await this.schedulerRepository.create({
        scenarioId,
        timeStart,
        timeEnd,
        cronExpression: this.convertToCronExpression(config),
        timezone,
        config: JSON.stringify(config),
      });

      if (scheduler.isActive) {
        this.scheduleJob(scheduler);
      }

      return scheduler;
    } catch (error) {
      this.logger.error('Failed to create scheduler:', error);
      throw new BadRequestException('Invalid scheduler data');
    }
  }

  async update(
    id: string,
    updateSchedulerDto: UpdateSchedulerDto,
    userId: string,
  ): Promise<Scheduler> {
    const scheduler = await this.schedulerRepository.findUserSchedulerById(
      id,
      userId,
    );

    if (!scheduler) {
      throw new NotFoundException('Scheduler not found');
    }

    const updated = await this.schedulerRepository.update(id, {
      scenarioId: updateSchedulerDto.scenarioId,
      timeStart: updateSchedulerDto.timeStart,
      timeEnd: updateSchedulerDto.timeEnd,
      cronExpression: this.convertToCronExpression(updateSchedulerDto.config),
      timezone: updateSchedulerDto.timezone,
      config: JSON.stringify(updateSchedulerDto.config),
    });

    await this.handleUpdateJob(updated);

    return updated;
  }

  async delete(id: string, userId: string): Promise<void> {
    const scheduler = await this.schedulerRepository.findUserSchedulerById(
      id,
      userId,
    );

    if (!scheduler) {
      throw new NotFoundException('Scheduler not found or access denied');
    }

    await this.handleDeleteJob(id);
    await this.schedulerRepository.delete(id);
  }
}
