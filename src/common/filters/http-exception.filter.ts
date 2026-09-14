import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import type { RequestWithId } from '../interfaces/request-with-id.interface';
import { resolveRequestId } from '../request-id';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();
    const requestId =
      request.requestId ?? resolveRequestId(request.headers?.['x-request-id']);

    if (!request.requestId) {
      request.requestId = requestId;
      response.setHeader('X-Request-Id', requestId);
    }

    const boundaryStatus = this.getBoundaryStatus(exception);
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : (boundaryStatus ?? HttpStatus.INTERNAL_SERVER_ERROR);

    const error =
      exception instanceof HttpException
        ? exception.getResponse()
        : boundaryStatus && exception instanceof Error
          ? exception.message
          : 'Internal server error';

    if (status >= 500) {
      this.logger.error(
        JSON.stringify({
          event: 'http_error',
          requestId,
          method: request.method,
          path: request.path,
          statusCode: status,
          errorType:
            exception instanceof Error
              ? exception.constructor.name
              : 'UnknownError',
        }),
      );
    }

    response.status(status).json({
      success: false,
      error,
      path: request.originalUrl,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }

  private getBoundaryStatus(exception: unknown): number | undefined {
    if (!(exception instanceof Error)) return undefined;
    const candidate = exception as Error & {
      status?: unknown;
      statusCode?: unknown;
    };
    const value = candidate.statusCode ?? candidate.status;

    return typeof value === 'number' && value >= 400 && value < 500
      ? value
      : undefined;
  }
}
