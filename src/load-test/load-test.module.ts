import { LoadTestsController } from '@/load-test/controllers/load-tests.controller';
import { MetricsController } from '@/load-test/controllers/metrics.controller';
import { InfluxDBService } from '@/load-test/services/influxdb.service';
import { K6Service } from '@/load-test/services/k6.service';
import { LoadTestsService } from '@/load-test/services/load-tests.service';
import { MetricsService } from '@/load-test/services/metrics.service';
import { RunHistoryRepository } from '@/run-history/run-history.repository';
import { ScenarioRepository } from '@/scenario/repositories/scenario.repository';
import { PrismaService } from '@/shared/services/prisma.service';
import { SharedModule } from '@/shared/shared.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    SharedModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
  ],
  controllers: [LoadTestsController, MetricsController],
  providers: [
    LoadTestsService,
    InfluxDBService,
    MetricsService,
    PrismaService,
    K6Service,
    ScenarioRepository,
    RunHistoryRepository,
  ],
  exports: [LoadTestsService, MetricsService],
})
export class LoadTestModule {}
