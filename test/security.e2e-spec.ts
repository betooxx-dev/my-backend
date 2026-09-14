import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

import { configureApplication } from '../src/configure-application';
import type { ApiKeysService } from '../src/modules/api-keys/api-keys.service';

describe('HTTP security controls (e2e)', () => {
  let app: NestExpressApplication;
  let postgres: StartedPostgreSqlContainer;
  let adminToken: string;

  beforeAll(async () => {
    postgres = await new PostgreSqlContainer('postgres:14.3')
      .withDatabase('my_backend_security_e2e')
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
      JWT_SECRET: 'http-security-secret-that-is-at-least-32-chars',
      API_KEY_PREFIX: 'mybackend_',
      API_PUBLIC_URL: 'http://localhost/api',
      BLOG_ASSET_DRIVER: 'local',
      BLOG_ASSET_LOCAL_DIR: '.local/security-e2e-assets',
      THROTTLE_TTL_MS: '60000',
      THROTTLE_LIMIT: '2',
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

    const { ApiKeysService: ApiKeysServiceClass } = jest.requireActual<
      typeof import('../src/modules/api-keys/api-keys.service')
    >('../src/modules/api-keys/api-keys.service');
    const apiKeys = moduleRef.get<ApiKeysService>(ApiKeysServiceClass);
    adminToken = (
      await apiKeys.create({
        name: 'security-e2e-admin',
        scopes: ['blog:admin'],
      })
    ).token;
  });

  afterAll(async () => {
    await app?.close();
    await postgres?.stop();
  });

  it('adds Helmet headers and leaves public health endpoints unthrottled', async () => {
    const api = request(app.getHttpServer());

    const response = await api.get('/api/health/live').expect(200);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');

    for (let attempt = 0; attempt < 5; attempt++)
      await api.get('/api/health/live').expect(200);
  });

  it('returns 429 after the configured limit on a non-health route', async () => {
    const api = request(app.getHttpServer());

    await api.get('/api/blog/posts?locale=es').expect(200);
    await api.get('/api/blog/posts?locale=es').expect(200);
    const limited = await api.get('/api/blog/posts?locale=es').expect(429);

    const adminCategories = api
      .get('/api/blog/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`);
    await adminCategories.expect(200);
    await api
      .get('/api/blog/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    await api
      .get('/api/blog/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(429);

    await api
      .get('/api/blog/admin/assets')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    await api
      .get('/api/blog/admin/assets')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    await api
      .get('/api/blog/admin/assets')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(429);

    expect(limited.body).toMatchObject({ success: false });
  });
});
