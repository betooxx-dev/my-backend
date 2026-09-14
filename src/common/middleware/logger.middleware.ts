import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import type { RequestWithId } from '../interfaces/request-with-id.interface';
import { resolveRequestId } from '../request-id';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggerMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const request = req as RequestWithId;
    const requestId = resolveRequestId(req.headers['x-request-id']);
    request.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    const start = Date.now();

    res.on('finish', () => {
      this.logger.log(
        JSON.stringify({
          event: 'http_request',
          requestId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          contentLength: res.get('content-length') ?? '0',
          durationMs: Date.now() - start,
        }),
      );
    });

    next();
  }
}
