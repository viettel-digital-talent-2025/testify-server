import { Module } from '@nestjs/common';
import { RunHistoryService } from './run-history.service';
import { RunHistoryController } from './run-history.controller';
import { RunHistoryRepository } from './run-history.repository';
import { PrismaService } from '../shared/services/prisma.service';

@Module({
  imports: [],
  controllers: [RunHistoryController],
  providers: [RunHistoryService, RunHistoryRepository, PrismaService],
  exports: [RunHistoryService],
})
export class RunHistoryModule {}
