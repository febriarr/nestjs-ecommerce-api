import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ApiSuccessResponse, WithMetadata } from '../types/api-response.type';
import { map, Observable } from 'rxjs';

@Injectable()
export class TransformInterceptor<T = unknown> implements NestInterceptor<
  T,
  ApiSuccessResponse<T>
> {
  intercept(
    _: ExecutionContext,
    next: CallHandler<T>
  ): Observable<ApiSuccessResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        if (
          data !== null &&
          typeof data === 'object' &&
          'data' in data &&
          'metadata' in data
        ) {
          const { data: innerData, metadata } = data as WithMetadata<T>;
          return { ok: true, data: innerData, metadata };
        }
        return { ok: true, data: (data ?? null) as T };
      })
    );
  }
}
