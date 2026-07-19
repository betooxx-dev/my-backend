import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

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
        `${request.method} ${request.originalUrl}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      success: false,
      error,
      path: request.originalUrl,
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
