import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { SharedModule } from './shared/shared.module';
import { UserModule } from './user/user.module';
import { RedisModule, RedisModuleOptions } from '@nestjs-modules/ioredis';
import serverConfig from './shared/config';
import { Module } from '@nestjs/common';
import { ScenarioModule } from './scenario/scenario.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { LoadTestModule } from './load-test/load-test.module';
import { RunHistoryModule } from './run-history/run-history.module';

@Module({
  imports: [
    SharedModule,
    RedisModule.forRootAsync({
      useFactory: (): RedisModuleOptions => ({
        type: 'single',
        options: {
          host: serverConfig.REDIS_HOST,
          port: serverConfig.REDIS_PORT,
          // username: serverConfig.REDIS_USER,
          password: serverConfig.REDIS_PASSWORD,
          // tls: {
          //   rejectUnauthorized: true,
          // },
          retryStrategy: (times: number) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          maxRetriesPerRequest: 5,
        },
      }),
    }),
    AuthModule,
    UserModule,
    ScenarioModule,
    LoadTestModule,
    RunHistoryModule,
    // SchedulerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
