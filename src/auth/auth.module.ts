import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from 'src/user/user.module';
import { RedisModule } from '@nestjs-modules/ioredis';
import { MailService } from 'src/shared/services/mail.service';

@Module({
  imports: [UserModule, RedisModule],
  providers: [AuthService, MailService],
  controllers: [AuthController],
})
export class AuthModule {}
