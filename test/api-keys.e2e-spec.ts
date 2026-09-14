import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { configureApplication } from '../src/configure-application';
import { ApiKey } from '../src/modules/api-keys/entities/api-key.entity';
import { AddActiveApiKeyNameIndex1789000000000 } from '../src/migrations/1789000000000-AddActiveApiKeyNameIndex';
import type { ApiKeysService } from '../src/modules/api-keys/api-keys.service';

describe('API key hardening (e2e)', () => {
  let app: NestExpressApplication;
  let postgres: StartedPostgreSqlContainer;
  let apiKeys: ApiKeysService;
  let dataSource: DataSource;
  let adminToken: string;

  beforeAll(async () => {
    postgres = await new PostgreSqlContainer('postgres:14.3')
      .withDatabase('my_backend_api_keys_e2e')
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
      JWT_SECRET: 'api-key-hardening-secret-that-is-at-least-32-chars',
      API_KEY_PREFIX: 'mybackend_',
      API_PUBLIC_URL: 'http://localhost/api',
      BLOG_ASSET_DRIVER: 'local',
      BLOG_ASSET_LOCAL_DIR: '.local/api-keys-e2e-assets',
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
    apiKeys = moduleRef.get<ApiKeysService>(ApiKeysServiceClass);
    dataSource = moduleRef.get(DataSource);
    adminToken = (
      await apiKeys.create({
        name: 'api-keys-admin',
        scopes: ['blog:admin'],
      })
    ).token;
  });

  afterAll(async () => {
    await app?.close();
    await postgres?.stop();
  });

  it('rejects malformed authorization headers with 401 and accepts the exact form', async () => {
    const api = request(app.getHttpServer());
    const invalidHeaders = [
      'Basic token',
      'Bearer',
      'Bearer ',
      `Bearer ${adminToken} extra`,
      `Bearer  ${adminToken}`,
    ];

    for (const authorization of invalidHeaders) {
      await api
        .get('/api/blog/admin/categories')
        .set('Authorization', authorization)
        .expect(401);
    }

    await api
      .get('/api/blog/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('allows only one concurrent active name and reuses it after revoke', async () => {
    const results = await Promise.allSettled([
      apiKeys.create({ name: 'raced-api-key' }),
      apiKeys.create({ name: 'raced-api-key' }),
    ]);
    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    const rejectedResult = rejected[0];
    if (rejectedResult.status !== 'rejected')
      throw new Error('Expected rejection');
    expect(rejectedResult.reason).toMatchObject({ status: 409 });

    const created = (fulfilled[0] as PromiseFulfilledResult<{ record: ApiKey }>)
      .value;
    await apiKeys.revoke(created.record.id);
    const replacement = await apiKeys.create({ name: 'raced-api-key' });

    expect(replacement.record.name).toBe('raced-api-key');
    const history = (await apiKeys.list()).filter(
      (key) => key.name === 'raced-api-key',
    );
    expect(history).toHaveLength(2);
    expect(history.filter((key) => key.revokedAt)).toHaveLength(1);
    expect(history.filter((key) => !key.revokedAt)).toHaveLength(1);
  });

  it('runs the active-name migration down and up without losing records', async () => {
    const preserved = await apiKeys.create({ name: 'migration-preserved-key' });
    const migration = new AddActiveApiKeyNameIndex1789000000000();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await migration.down(queryRunner);
      await expect(
        queryRunner.manager.getRepository(ApiKey).findOneBy({
          id: preserved.record.id,
        }),
      ).resolves.toMatchObject({ id: preserved.record.id });

      await migration.up(queryRunner);
      await expect(
        queryRunner.manager.getRepository(ApiKey).findOneBy({
          id: preserved.record.id,
        }),
      ).resolves.toMatchObject({ id: preserved.record.id });
    } finally {
      await queryRunner.release();
    }
  });
});
