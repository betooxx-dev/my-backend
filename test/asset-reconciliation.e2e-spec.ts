import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';

import { Test } from '@nestjs/testing';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AssetReconciler } from '../src/modules/blogs/assets/asset-reconciler';
import {
  BLOG_ASSET_STORAGE,
  BlogAssetStorage,
} from '../src/modules/blogs/assets/blog-asset-storage';
import { BlogAsset } from '../src/modules/blogs/entities';

describe('Asset reconciliation (e2e)', () => {
  let app: NestExpressApplication;
  let postgres: StartedPostgreSqlContainer;
  const assetRoot = resolve(
    '.local',
    `asset-reconciliation-e2e-${process.pid}`,
  );

  beforeAll(async () => {
    await rm(assetRoot, { recursive: true, force: true });
    postgres = await new PostgreSqlContainer('postgres:14.3')
      .withDatabase('my_backend_asset_reconciliation_e2e')
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
      JWT_SECRET: 'asset-reconciliation-secret-that-is-at-least-32-chars',
      API_KEY_PREFIX: 'mybackend_',
      API_PUBLIC_URL: 'http://localhost/api',
      BLOG_ASSET_DRIVER: 'local',
      BLOG_ASSET_LOCAL_DIR: assetRoot,
    });

    const { AppModule } =
      jest.requireActual<typeof import('../src/app.module')>(
        '../src/app.module',
      );
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await postgres?.stop();
    await rm(assetRoot, { recursive: true, force: true });
  });

  it('reconciles real PostgreSQL rows against local storage idempotently', async () => {
    const reconciler = app.get(AssetReconciler);
    const storage = app.get<BlogAssetStorage>(BLOG_ASSET_STORAGE);
    const repository = app.get<Repository<BlogAsset>>(
      getRepositoryToken(BlogAsset),
    );
    const knownKey = 'blog/2026/09/known.png';
    const missingKey = 'blog/2026/09/missing.png';
    const orphanKey = 'blog/2026/09/orphan.png';

    await repository.save(
      repository.create({
        storageKey: knownKey,
        originalName: 'known.png',
        mimeType: 'image/png',
        sizeBytes: 5,
        width: 1,
        height: 1,
        sha256: 'a'.repeat(64),
        altText: 'Known asset',
      }),
    );
    await repository.save(
      repository.create({
        storageKey: missingKey,
        originalName: 'missing.png',
        mimeType: 'image/png',
        sizeBytes: 5,
        width: 1,
        height: 1,
        sha256: 'b'.repeat(64),
        altText: 'Missing asset',
      }),
    );
    await storage.put({
      key: knownKey,
      body: Buffer.from('known'),
      contentType: 'image/png',
      checksumSha256: 'a'.repeat(64),
    });
    await storage.put({
      key: orphanKey,
      body: Buffer.from('orphan'),
      contentType: 'image/png',
      checksumSha256: 'c'.repeat(64),
    });

    const now = new Date('2026-09-14T12:00:00.000Z');
    const report = await reconciler.reconcile({ now });
    const repeat = await reconciler.reconcile({ now });

    expect(report).toMatchObject({
      dryRun: true,
      databaseRows: 2,
      storageObjects: 2,
      orphanObjects: [orphanKey],
      missingRows: [missingKey],
      deletedObjects: [],
    });
    expect(repeat).toEqual(report);
    await expect(storage.read(orphanKey)).resolves.toBeDefined();
  });
});
