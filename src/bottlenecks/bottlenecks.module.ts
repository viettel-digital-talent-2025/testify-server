import { MailService } from '@/shared/services/mail.service';
import { RedisModule } from '@nestjs-modules/ioredis';
import { Module } from '@nestjs/common';
import { BottlenecksController } from './bottlenecks.controller';
import { BottlenecksRepository } from './bottlenecks.repository';
import { BottlenecksService } from './bottlenecks.service';

@Module({
  imports: [RedisModule],
  controllers: [BottlenecksController],
  providers: [BottlenecksService, BottlenecksRepository, MailService],
})
export class BottlenecksModule {}
