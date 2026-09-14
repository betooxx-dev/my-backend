import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

import { configureApplication } from '../src/configure-application';

describe('Health endpoints (e2e)', () => {
  let app: NestExpressApplication;
  let postgres: StartedPostgreSqlContainer;
  let accessLog: jest.SpyInstance;
  let errorLog: jest.SpyInstance;

  function findEvent(
    logger: jest.SpyInstance,
    eventName: string,
    requestId: string,
  ): Record<string, unknown> | undefined {
    return logger.mock.calls.flatMap((call: unknown[]) => {
      const [message] = call;
      if (typeof message !== 'string') return [];

      try {
        const event = JSON.parse(message) as Record<string, unknown>;
        return event.event === eventName && event.requestId === requestId
          ? [event]
          : [];
      } catch {
        return [];
      }
    })[0];
  }

  beforeAll(async () => {
    accessLog = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    errorLog = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    postgres = await new PostgreSqlContainer('postgres:14.3')
      .withDatabase('my_backend_health_e2e')
      .start();

    Object.assign(process.env, {
      STAGE: 'test',
      PORT: '0',
      CLIENT_URL: 'http://localhost:3000',
      DB_HOST: postgres.getHost(),
      DB_PORT: String(postgres.getPort()),
      DB_USER: postgres.getUsername(),
      DB_PASSWORD: postgres.getPassword(),
      DB_NAME: postgres.getDatabase(),
      JWT_SECRET: 'health-endpoints-secret-that-is-at-least-32-chars',
      API_KEY_PREFIX: 'mybackend_',
      API_PUBLIC_URL: 'http://localhost/api',
      BLOG_ASSET_DRIVER: 'local',
      BLOG_ASSET_LOCAL_DIR: '.local/health-e2e-assets',
    });

    const { AppModule } =
      jest.requireActual<typeof import('../src/app.module')>(
        '../src/app.module',
      );
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApplication(app, {
      clientUrl: 'http://localhost:3000',
      enableSwagger: false,
    });
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await postgres?.stop();
    accessLog?.mockRestore();
    errorLog?.mockRestore();
  });

  it('returns safe public 200 responses while PostgreSQL is healthy', async () => {
    const api = request(app.getHttpServer());
    const requestId = '550e8400-e29b-41d4-a716-446655440000';
    const live = await api
      .get('/api/health/live')
      .set('x-request-id', requestId)
      .expect(200);
    const ready = await api.get('/api/health/ready').expect(200);

    expect(live.body).toEqual({ success: true, data: { status: 'ok' } });
    expect(live.headers['x-request-id']).toBe(requestId);
    expect(ready.body).toEqual({ success: true, data: { status: 'ok' } });
    expect(JSON.stringify(ready.body)).not.toMatch(
      /password|postgres|secret|sql/i,
    );

    expect(findEvent(accessLog, 'http_request', requestId)).toMatchObject({
      method: 'GET',
      path: '/api/health/live',
      statusCode: 200,
    });
  });

  it('keeps liveness at 200 and returns a safe 503 when PostgreSQL is unavailable', async () => {
    await postgres.stop();
    const api = request(app.getHttpServer());
    const requestId = '550e8400-e29b-41d4-a716-446655440001';

    const live = await api.get('/api/health/live').expect(200);
    const ready = await api
      .get('/api/health/ready')
      .set('x-request-id', requestId)
      .expect(503);

    expect(live.body).toEqual({ success: true, data: { status: 'ok' } });
    expect(ready.body).toMatchObject({
      success: false,
      requestId,
      error: {
        statusCode: 503,
        message: 'Readiness check failed',
      },
    });
    expect(JSON.stringify(ready.body)).not.toMatch(
      /password|postgres|secret|sql|stack/i,
    );
    expect(findEvent(accessLog, 'http_request', requestId)).toMatchObject({
      path: '/api/health/ready',
      statusCode: 503,
    });
    expect(findEvent(errorLog, 'http_error', requestId)).toMatchObject({
      path: '/api/health/ready',
      statusCode: 503,
      errorType: 'ServiceUnavailableException',
    });
  });
});
