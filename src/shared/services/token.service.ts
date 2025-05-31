import serverConfig from '@/shared/config';
import { TokenPayload } from '@/shared/types/jwt.types';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  signAccessToken(payload: TokenPayload): string {
    return this.jwtService.sign(payload, {
      secret: serverConfig.jwt.ACCESS_TOKEN_SECRET,
      expiresIn: serverConfig.jwt.ACCESS_TOKEN_EXPIRATION,
      algorithm: 'HS256',
    });
  }

  signRefreshToken(payload: TokenPayload): string {
    return this.jwtService.sign(payload, {
      secret: serverConfig.jwt.REFRESH_TOKEN_SECRET,
      expiresIn: serverConfig.jwt.REFRESH_TOKEN_EXPIRATION,
      algorithm: 'HS256',
    });
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    return await this.jwtService.verifyAsync(token, {
      secret: serverConfig.jwt.ACCESS_TOKEN_SECRET,
      algorithms: ['HS256'],
    });
  }

  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    return await this.jwtService.verifyAsync(token, {
      secret: serverConfig.jwt.REFRESH_TOKEN_SECRET,
      algorithms: ['HS256'],
    });
  }
}
