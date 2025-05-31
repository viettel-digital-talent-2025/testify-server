import { AuthController } from '@/auth/auth.controller';
import { AuthService } from '@/auth/auth.service';
import { MailService } from '@/shared/services/mail.service';
import { UserModule } from '@/user/user.module';
import { RedisModule } from '@nestjs-modules/ioredis';
import { Module } from '@nestjs/common';

@Module({
  imports: [UserModule, RedisModule],
  providers: [AuthService, MailService],
  controllers: [AuthController],
})
export class AuthModule {}
