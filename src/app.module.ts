import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { AuthModule } from '@/auth/auth.module';
import { LoadTestModule } from '@/load-test/load-test.module';
import { RunHistoryModule } from '@/run-history/run-history.module';
import { ScenarioModule } from '@/scenario/scenario.module';
import { SchedulerModule } from '@/scheduler/scheduler.module';
import serverConfig from '@/shared/config';
import { SharedModule } from '@/shared/shared.module';
import { UserModule } from '@/user/user.module';
import { RedisModule, RedisModuleOptions } from '@nestjs-modules/ioredis';
import { Module } from '@nestjs/common';
import { BottlenecksModule } from './bottlenecks/bottlenecks.module';

@Module({
  imports: [
    SharedModule,
    RedisModule.forRootAsync({
      useFactory: (): RedisModuleOptions => ({
        type: 'single',
        options: {
          host: serverConfig.redis.REDIS_HOST,
          port: serverConfig.redis.REDIS_PORT,
          username: serverConfig.redis.REDIS_USER ?? undefined,
          password: serverConfig.redis.REDIS_PASSWORD,
          tls: serverConfig.redis.REDIS_USER
            ? {
                rejectUnauthorized: true,
              }
            : undefined,
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
    SchedulerModule,
    BottlenecksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
