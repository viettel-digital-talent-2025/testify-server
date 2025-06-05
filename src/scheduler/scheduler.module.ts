import { LoadTestModule } from '@/load-test/load-test.module';
import { SchedulerController } from '@/scheduler/scheduler.controller';
import { SchedulerRepository } from '@/scheduler/scheduler.repository';
import { SchedulerService } from '@/scheduler/scheduler.service';
import { PrismaService } from '@/shared/services/prisma.service';
import { SharedModule } from '@/shared/shared.module';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ScheduleModule.forRoot(), SharedModule, LoadTestModule],
  controllers: [SchedulerController],
  providers: [SchedulerService, SchedulerRepository, PrismaService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
