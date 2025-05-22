import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenPayload } from '../types/jwt.type';
import serverConfig from '../config';

@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  signAccessToken(payload: TokenPayload): string {
    return this.jwtService.sign(payload, {
      secret: serverConfig.ACCESS_TOKEN_SECRET,
      expiresIn: serverConfig.ACCESS_TOKEN_EXPIRATION,
      algorithm: 'HS256',
    });
  }

  signRefreshToken(payload: TokenPayload): string {
    return this.jwtService.sign(payload, {
      secret: serverConfig.REFRESH_TOKEN_SECRET,
      expiresIn: serverConfig.REFRESH_TOKEN_EXPIRATION,
      algorithm: 'HS256',
    });
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    return await this.jwtService.verifyAsync(token, {
      secret: serverConfig.ACCESS_TOKEN_SECRET,
      algorithms: ['HS256'],
    });
  }

  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    return await this.jwtService.verifyAsync(token, {
      secret: serverConfig.REFRESH_TOKEN_SECRET,
      algorithms: ['HS256'],
    });
  }
}
