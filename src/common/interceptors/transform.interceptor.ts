import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  ApiResponse,
  PaginatedResponse,
  PaginatedResult,
} from '../interfaces/api-response.interface';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T | PaginatedResult<T> | StreamableFile,
  ApiResponse<T> | PaginatedResponse<T> | StreamableFile
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T | PaginatedResult<T> | StreamableFile>,
  ): Observable<ApiResponse<T> | PaginatedResponse<T> | StreamableFile> {
    return next.handle().pipe(
      map(
        (response): ApiResponse<T> | PaginatedResponse<T> | StreamableFile => {
          if (response instanceof StreamableFile) return response;

          if (this.isPaginated<T>(response)) {
            return {
              success: true,
              data: response.data,
              meta: response.meta,
            } as PaginatedResponse<T>;
          }

          return {
            success: true,
            data: response,
          };
        },
      ),
    );
  }

  private isPaginated<U>(response: unknown): response is PaginatedResult<U> {
    return (
      response !== null &&
      typeof response === 'object' &&
      'data' in response &&
      'meta' in response &&
      Array.isArray((response as PaginatedResult<U>).data)
    );
  }
}
