import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenService } from '../../shared/services/token.service';
import { USER_KEY } from '../constants/auth.constant';
import { Redis } from 'ioredis';
import { Request } from 'express';
import { TokenPayload } from 'src/shared/types/jwt.type';
import { InjectRedis } from '@nestjs-modules/ioredis';

interface RequestWithAuth extends Request {
  headers: {
    authorization?: string;
  };
  cookies: {
    refreshToken?: string;
  };
  [USER_KEY]?: TokenPayload;
}

@Injectable()
export class TokenGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    @InjectRedis() private readonly redisClient: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const authHeader = request.headers?.authorization;
    const refreshToken = request.cookies?.refreshToken;

    if (!authHeader?.startsWith('Bearer ') || !refreshToken) {
      throw new UnauthorizedException();
    }

    const accessToken = authHeader.split(' ')[1];
    const redisKey = `refreshToken:${refreshToken}`;

    const redisValue = await this.redisClient.get(redisKey);

    if (!redisValue) {
      throw new UnauthorizedException();
    }

    try {
      const tokenPayload =
        await this.tokenService.verifyAccessToken(accessToken);
      request[USER_KEY] = tokenPayload;
    } catch {
      throw new UnauthorizedException();
    }

    return true;
  }
}
