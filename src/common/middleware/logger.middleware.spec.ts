import { Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

import type { RequestWithId } from '../interfaces/request-with-id.interface';
import { LoggerMiddleware } from './logger.middleware';

function makeResponse() {
  let finishHandler: (() => void) | undefined;
  const response = {} as Response & {
    statusCode: number;
    get: jest.Mock;
    setHeader: jest.Mock;
  };
  const setHeader = jest.fn();

  Object.assign(response, {
    statusCode: 200,
    get: jest.fn().mockReturnValue('39'),
    setHeader,
    on: (_event: string, handler: () => void): Response => {
      finishHandler = handler;
      return response;
    },
  });

  return {
    response,
    setHeader,
    finish: () => finishHandler?.(),
  };
}

describe('LoggerMiddleware', () => {
  const validRequestId = '550e8400-e29b-41d4-a716-446655440000';
  let log: jest.SpyInstance;

  beforeEach(() => {
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('propagates a valid request ID and writes a structured access event', () => {
    const request = {
      method: 'GET',
      path: '/api/blog/posts',
      headers: { 'x-request-id': validRequestId },
    } as unknown as RequestWithId;
    const { response, setHeader, finish } = makeResponse();
    const next = jest.fn();

    new LoggerMiddleware().use(request, response, next);
    finish();

    expect(request.requestId).toBe(validRequestId);
    expect(setHeader).toHaveBeenCalledWith('X-Request-Id', validRequestId);
    expect(next).toHaveBeenCalledTimes(1);

    const calls = log.mock.calls as unknown[][];
    const event = JSON.parse(calls[0]?.[0] as string) as Record<
      string,
      unknown
    >;
    expect(event).toMatchObject({
      event: 'http_request',
      requestId: validRequestId,
      method: 'GET',
      path: '/api/blog/posts',
      statusCode: 200,
      contentLength: '39',
    });
    expect(event).not.toHaveProperty('authorization');
    expect(event).not.toHaveProperty('body');
  });

  it('generates a new request ID for an invalid header without logging it', () => {
    const invalidRequestId = 'not-safe-to-reflect';
    const request = {
      method: 'POST',
      path: '/api/blog/admin/assets',
      headers: { 'x-request-id': invalidRequestId },
    } as unknown as RequestWithId;
    const { response, finish } = makeResponse();

    new LoggerMiddleware().use(request, response, jest.fn());
    finish();

    expect(request.requestId).toEqual(
      expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      ),
    );
    expect(request.requestId).not.toBe(invalidRequestId);
    expect(JSON.stringify(log.mock.calls)).not.toContain(invalidRequestId);
  });
});
