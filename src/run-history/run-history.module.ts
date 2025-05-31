import { RunHistoryController } from '@/run-history/run-history.controller';
import { RunHistoryRepository } from '@/run-history/run-history.repository';
import { RunHistoryService } from '@/run-history/run-history.service';
import { PrismaService } from '@/shared/services/prisma.service';
import { SharedModule } from '@/shared/shared.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [SharedModule],
  controllers: [RunHistoryController],
  providers: [RunHistoryService, RunHistoryRepository, PrismaService],
  exports: [RunHistoryService],
})
export class RunHistoryModule {}
