import { Global, Module } from '@nestjs/common';
import { PrismaService } from './services/prisma.service';
import { HashingService } from './services/hashing.service';
import { TokenService } from './services/token.service';
import { JwtModule } from '@nestjs/jwt';

@Global()
@Module({
  imports: [JwtModule],
  exports: [PrismaService, HashingService, TokenService],
  providers: [PrismaService, HashingService, TokenService],
})
export class SharedModule {}
