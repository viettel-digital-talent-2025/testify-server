import { AppLoggerService } from '@/shared/services/app-logger.service';
import { HashingService } from '@/shared/services/hashing.service';
import { PrismaService } from '@/shared/services/prisma.service';
import { TokenService } from '@/shared/services/token.service';
import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

@Global()
@Module({
  imports: [JwtModule],
  exports: [PrismaService, HashingService, TokenService, AppLoggerService],
  providers: [PrismaService, HashingService, TokenService, AppLoggerService],
})
export class SharedModule {}
