import { AppLoggerService } from '@/shared/services/app-logger.service';
import { PrismaService } from '@/shared/services/prisma.service';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { RunHistoryMetrics } from '@prisma/client';
import { CreateRunHistoryMetricsDto } from '../dtos/run-history-metrics.dto';

@Injectable()
export class RunHistoryMetricsRepository {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly prisma: PrismaService,
  ) {
    this.logger.setContext(RunHistoryMetricsRepository.name);
  }

  async create(data: CreateRunHistoryMetricsDto): Promise<RunHistoryMetrics> {
    try {
      return await this.prisma.runHistoryMetrics.create({
        data,
      });
    } catch (error) {
      this.logger.error('Failed to create RunHistoryMetrics', error);
      throw new InternalServerErrorException(
        'Failed to create RunHistoryMetrics',
      );
    }
  }
}
