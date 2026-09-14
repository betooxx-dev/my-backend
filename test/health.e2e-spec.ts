import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

import { configureApplication } from '../src/configure-application';

describe('Health endpoints (e2e)', () => {
  let app: NestExpressApplication;
  let postgres: StartedPostgreSqlContainer;

  beforeAll(async () => {
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
  });

  it('returns safe public 200 responses while PostgreSQL is healthy', async () => {
    const api = request(app.getHttpServer());
    const live = await api.get('/api/health/live').expect(200);
    const ready = await api.get('/api/health/ready').expect(200);

    expect(live.body).toEqual({ success: true, data: { status: 'ok' } });
    expect(ready.body).toEqual({ success: true, data: { status: 'ok' } });
    expect(JSON.stringify(ready.body)).not.toMatch(
      /password|postgres|secret|sql/i,
    );
  });

  it('keeps liveness at 200 and returns a safe 503 when PostgreSQL is unavailable', async () => {
    await postgres.stop();
    const api = request(app.getHttpServer());

    const live = await api.get('/api/health/live').expect(200);
    const ready = await api.get('/api/health/ready').expect(503);

    expect(live.body).toEqual({ success: true, data: { status: 'ok' } });
    expect(ready.body).toMatchObject({
      success: false,
      error: {
        statusCode: 503,
        message: 'Readiness check failed',
      },
    });
    expect(JSON.stringify(ready.body)).not.toMatch(
      /password|postgres|secret|sql|stack/i,
    );
  });
});
