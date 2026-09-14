import { BadRequestException, Logger } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import type { Request, Response } from 'express';

import type { RequestWithId } from '../interfaces/request-with-id.interface';
import { AllExceptionsFilter } from './http-exception.filter';

function makeHost(request: RequestWithId) {
  const status = jest.fn().mockReturnThis();
  const json = jest.fn();
  const setHeader = jest.fn();
  const response = {
    status,
    json,
    setHeader,
  } as unknown as Response;

  return {
    status,
    json,
    setHeader,
    host: {
      switchToHttp: () => ({
        getRequest: () => request as Request,
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost,
  };
}

describe('AllExceptionsFilter', () => {
  const validRequestId = '550e8400-e29b-41d4-a716-446655440000';
  let errorLog: jest.SpyInstance;

  beforeEach(() => {
    errorLog = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('includes requestId in safe 5xx responses and structured error logs', () => {
    const request = {
      method: 'GET',
      path: '/api/health/ready',
      originalUrl: '/api/health/ready?token=do-not-log',
      requestId: validRequestId,
      headers: { authorization: 'Bearer do-not-log' },
      body: { password: 'do-not-log' },
    } as unknown as RequestWithId;
    const { status, json, host } = makeHost(request);

    new AllExceptionsFilter().catch(new Error('password=do-not-log'), host);

    const jsonCalls = json.mock.calls as unknown[][];
    const body = jsonCalls[0]?.[0] as Record<string, unknown>;
    expect(status).toHaveBeenCalledWith(500);
    expect(body).toMatchObject({ success: false, requestId: validRequestId });

    const calls = errorLog.mock.calls as unknown[][];
    const event = JSON.parse(calls[0]?.[0] as string) as Record<
      string,
      unknown
    >;
    expect(event).toMatchObject({
      event: 'http_error',
      requestId: validRequestId,
      method: 'GET',
      path: '/api/health/ready',
      statusCode: 500,
      errorType: 'Error',
    });
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain('do-not-log');
  });

  it('adds a generated requestId when the filter is used without middleware', () => {
    const request = {
      method: 'GET',
      path: '/api/missing',
      originalUrl: '/api/missing',
    } as unknown as RequestWithId;
    const { json, setHeader, host } = makeHost(request);

    new AllExceptionsFilter().catch(new BadRequestException('invalid'), host);

    const jsonCalls = json.mock.calls as unknown[][];
    const body = jsonCalls[0]?.[0] as Record<string, unknown>;
    expect(body.requestId).toEqual(
      expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      ),
    );
    expect(setHeader).toHaveBeenCalledWith('X-Request-Id', body.requestId);
    expect(errorLog).not.toHaveBeenCalled();
  });
});
