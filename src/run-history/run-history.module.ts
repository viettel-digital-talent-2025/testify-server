import { RunHistoryRepository } from '@/run-history/repositories/run-history.repository';
import { RunHistoryController } from '@/run-history/run-history.controller';
import { RunHistoryService } from '@/run-history/run-history.service';
import { PrismaService } from '@/shared/services/prisma.service';
import { SharedModule } from '@/shared/shared.module';
import { Module } from '@nestjs/common';
import { RunHistoryMetricsRepository } from './repositories/run-history-metrics.repository';

@Module({
  imports: [SharedModule],
  controllers: [RunHistoryController],
  providers: [
    PrismaService,
    RunHistoryService,
    RunHistoryRepository,
    RunHistoryMetricsRepository,
  ],
  exports: [RunHistoryService],
})
export class RunHistoryModule {}
