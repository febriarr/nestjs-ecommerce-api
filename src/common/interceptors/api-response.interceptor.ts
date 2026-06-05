import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ApiSuccessResponse } from '../types/api-response.type';
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
    return next.handle().pipe(map((data) => ({ ok: true, data })));
  }
}
