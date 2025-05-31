import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ResponseData<T> {
  statusCode: number;
  data: T;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ResponseData<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseData<T>> {
    return next.handle().pipe(
      map((data: unknown) => {
        const response = context.switchToHttp().getResponse<ExpressResponse>();
        const statusCode = response.statusCode;

        // If data is null/undefined, return empty object to prevent serialization issues
        const transformedData = (
          data === undefined || data === null ? {} : data
        ) as T;

        return {
          statusCode,
          message: 'success',
          data: transformedData,
        };
      }),
    );
  }
}
