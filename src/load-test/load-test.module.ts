import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from '@nestjs/config';
import { LoadTestService } from './load-test.service';
import { LoadTestController } from './load-test.controller';
import { SharedModule } from '../shared/shared.module';
import { InfluxDBService } from './influxdb.service';

@Module({
  imports: [
    SharedModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventEmitterModule.forRoot({
      // Global event emitter options
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
  ],
  controllers: [LoadTestController],
  providers: [LoadTestService, InfluxDBService],
  exports: [LoadTestService],
})
export class LoadTestModule {}
