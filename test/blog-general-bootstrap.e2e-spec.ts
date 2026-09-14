/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';

import { configureApplication } from '../src/configure-application';

describe('General category bootstrap (e2e)', () => {
  let app: NestExpressApplication;
  let postgres: StartedPostgreSqlContainer;
  let assetDirectory: string;
  let adminToken: string;
  let categoryBootstrap: {
    onApplicationBootstrap: () => Promise<void>;
  };

  beforeAll(async () => {
    postgres = await new PostgreSqlContainer('postgres:14.3')
      .withDatabase('my_backend_general_e2e')
      .start();
    assetDirectory = await mkdtemp(join(tmpdir(), 'my-backend-general-e2e-'));

    Object.assign(process.env, {
      STAGE: 'dev',
      PORT: '0',
      CLIENT_URL: 'http://localhost:3000',
      DB_HOST: postgres.getHost(),
      DB_PORT: String(postgres.getPort()),
      DB_USER: postgres.getUsername(),
      DB_PASSWORD: postgres.getPassword(),
      DB_NAME: postgres.getDatabase(),
      JWT_SECRET: 'general-bootstrap-secret-that-is-at-least-32-chars',
      API_KEY_PREFIX: 'mybackend_',
      API_PUBLIC_URL: 'http://localhost/api',
      BLOG_ASSET_DRIVER: 'local',
      BLOG_ASSET_LOCAL_DIR: assetDirectory,
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

    const { ApiKeysService } = jest.requireActual<
      typeof import('../src/modules/api-keys/api-keys.service')
    >('../src/modules/api-keys/api-keys.service');
    const apiKeys = moduleRef.get<ApiKeysService>(ApiKeysService);
    adminToken = (
      await apiKeys.create({
        name: 'general-bootstrap-e2e',
        scopes: ['blog:admin'],
      })
    ).token;

    const { BlogCategoryBootstrap } = jest.requireActual<
      typeof import('../src/modules/blogs/categories/blog-category-bootstrap')
    >('../src/modules/blogs/categories/blog-category-bootstrap');
    categoryBootstrap = moduleRef.get(BlogCategoryBootstrap);
  });

  afterAll(async () => {
    await app?.close();
    await postgres?.stop();
    await rm(assetDirectory, { recursive: true, force: true });
  });

  it('creates one General category and defaults posts to it', async () => {
    const api = request(app.getHttpServer());
    const auth = `Bearer ${adminToken}`;

    const initial = await api
      .get('/api/blog/admin/categories')
      .set('Authorization', auth)
      .expect(200);
    expect(initial.body.data).toEqual([
      { name: 'General', key: 'general', position: 0 },
    ]);

    await categoryBootstrap.onApplicationBootstrap();

    const afterSecondBootstrap = await api
      .get('/api/blog/admin/categories')
      .set('Authorization', auth)
      .expect(200);
    expect(afterSecondBootstrap.body.data).toHaveLength(1);

    const created = await api
      .post('/api/blog/admin/posts')
      .set('Authorization', auth)
      .send({
        locale: 'es',
        slug: 'defaults-to-general',
        title: 'Defaults to General',
        excerpt: 'A post without an explicit category.',
      })
      .expect(201);
    expect(created.body.data.category).toBe('General');
  });
});
