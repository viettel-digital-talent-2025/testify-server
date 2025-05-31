import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
}

@Injectable()
export class RTInterceptor implements NestInterceptor<unknown, unknown> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const res = ctx.getResponse<Response>();

    return next.handle().pipe(
      tap((data: TokenResponse) => {
        if (data?.refreshToken) {
          res.cookie('refreshToken', data.refreshToken, {
            httpOnly: true,
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: 'none',
            secure: true,
          });
          delete data.refreshToken;
        }
      }),
    );
  }
}
