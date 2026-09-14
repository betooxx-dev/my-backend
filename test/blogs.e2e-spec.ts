import { blogAdminScenarios } from './blog-admin-scenarios';
/*
 * Supertest and Nest expose the test HTTP server and decoded JSON bodies as
 * `any`; assertions below deliberately validate those runtime boundaries.
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import request from 'supertest';

import { configureApplication } from '../src/configure-application';

const TEST_ASSET_MAX_BYTES = 64 * 1024;

describe('Blogs API (e2e)', () => {
  blogAdminScenarios(() => ({ app, token: adminToken }));
  let app: NestExpressApplication;
  let postgres: StartedPostgreSqlContainer;
  let adminToken: string;
  let unscopedToken: string;
  let assetDirectory: string;

  beforeAll(async () => {
    postgres = await new PostgreSqlContainer('postgres:14.3')
      .withDatabase('my_backend_e2e')
      .start();
    assetDirectory = await mkdtemp(join(tmpdir(), 'my-backend-assets-e2e-'));

    Object.assign(process.env, {
      STAGE: 'test',
      PORT: '0',
      CLIENT_URL: 'http://localhost:3000',
      DB_HOST: postgres.getHost(),
      DB_PORT: String(postgres.getPort()),
      DB_USER: postgres.getUsername(),
      DB_PASSWORD: postgres.getPassword(),
      DB_NAME: postgres.getDatabase(),
      JWT_SECRET: 'test-secret-that-is-at-least-32-characters-long',
      API_KEY_PREFIX: 'mybackend_',
      API_PUBLIC_URL: 'http://localhost/api',
      BLOG_ASSET_DRIVER: 'local',
      BLOG_ASSET_LOCAL_DIR: assetDirectory,
      BLOG_ASSET_MAX_BYTES: String(TEST_ASSET_MAX_BYTES),
    });

    const { AppModule } =
      jest.requireActual<typeof import('../src/app.module')>(
        '../src/app.module',
      );
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const { ApiKeysService } = jest.requireActual<
      typeof import('../src/modules/api-keys/api-keys.service')
    >('../src/modules/api-keys/api-keys.service');
    const apiKeys =
      moduleRef.get<
        import('../src/modules/api-keys/api-keys.service').ApiKeysService
      >(ApiKeysService);
    adminToken = (
      await apiKeys.create({ name: 'studio-e2e', scopes: ['blog:admin'] })
    ).token;
    unscopedToken = (await apiKeys.create({ name: 'unscoped-e2e', scopes: [] }))
      .token;

    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApplication(app, {
      clientUrl: 'http://localhost:3000',
      enableSwagger: false,
    });
    await app.init();
    await request(app.getHttpServer())
      .post('/api/blog/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Engineering', position: 0 })
      .expect(201);
  });

  afterAll(async () => {
    await app?.close();
    await postgres?.stop();
    await rm(assetDirectory, { recursive: true, force: true });
  });

  it('serves an empty public blog through the production HTTP pipeline', async () => {
    await request(app.getHttpServer())
      .get('/api/blog/posts?locale=es')
      .expect(200)
      .expect({ success: true, data: [] });
  });

  it('creates a Markdown draft and retrieves it through the admin API', async () => {
    const contentMarkdown = [
      '# Shipping a personal studio',
      '',
      'A [useful link](https://example.com).',
      '',
      '```ts',
      'const ready = true;',
      '```',
    ].join('\n');

    const created = await request(app.getHttpServer())
      .post('/api/blog/admin/posts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        locale: 'es',
        slug: 'personal-studio',
        title: 'A personal studio',
        excerpt: 'How the publishing system works.',
        contentMarkdown,
        category: 'Engineering',
        tags: ['nestjs', 'studio'],
      })
      .expect(201);

    expect(created.body).toMatchObject({
      success: true,
      data: {
        locale: 'es',
        slug: 'personal-studio',
        status: 'draft',
        contentMarkdown,
        publishedAt: null,
      },
    });

    const id = created.body.data.id as string;
    await request(app.getHttpServer())
      .get(`/api/blog/admin/posts/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.data.contentMarkdown).toBe(contentMarkdown);
      });
  });

  it('updates draft editorial fields without losing Markdown structure', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/blog/admin/posts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        locale: 'en',
        slug: 'editable-draft',
        title: 'Editable draft',
        excerpt: 'Initial excerpt',
      })
      .expect(201);

    const updatedMarkdown = [
      '## A better structure',
      '',
      '- Draft safely',
      '- Publish deliberately',
      '',
      '![Studio diagram](https://assets.example.com/studio.webp)',
    ].join('\n');

    await request(app.getHttpServer())
      .patch(`/api/blog/admin/posts/${created.body.data.id as string}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Edited draft',
        contentMarkdown: updatedMarkdown,
        tags: ['writing', 'studio'],
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toMatchObject({
          title: 'Edited draft',
          contentMarkdown: updatedMarkdown,
          tags: ['writing', 'studio'],
          status: 'draft',
          publishedAt: null,
        });
      });
  });

  it('accepts Markdown bodies beyond the framework default JSON limit', async () => {
    const contentMarkdown = `# Long form\n\n${'word '.repeat(24_000)}`;

    await request(app.getHttpServer())
      .post('/api/blog/admin/posts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        locale: 'es',
        slug: 'long-form-draft',
        title: 'Long form draft',
        excerpt: 'A draft large enough to exercise the documented contract.',
        contentMarkdown,
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.data.contentMarkdown).toBe(contentMarkdown);
      });

    await request(app.getHttpServer())
      .post('/api/blog/admin/posts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        locale: 'es',
        slug: 'body-too-large',
        title: 'Body too large',
        excerpt: 'This request must stop at the HTTP boundary.',
        contentMarkdown: 'x'.repeat(270_000),
      })
      .expect(413);
  });

  it('uploads a validated image and serves the exact stored bytes publicly', async () => {
    const png = await sharp({
      create: {
        width: 4,
        height: 3,
        channels: 4,
        background: '#336699',
      },
    })
      .png()
      .toBuffer();

    const uploaded = await request(app.getHttpServer())
      .post('/api/blog/admin/assets')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('altText', 'Studio cover')
      .attach('file', png, {
        filename: 'studio-cover.png',
        contentType: 'image/png',
      })
      .expect(201);

    expect(uploaded.body.data).toMatchObject({
      altText: 'Studio cover',
      mimeType: 'image/png',
      sizeBytes: png.length,
      width: 4,
      height: 3,
    });
    expect(uploaded.body.data.markdown).toContain('![Studio cover](');

    await request(app.getHttpServer())
      .get(`/api/blog/assets/${uploaded.body.data.id as string}`)
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect('Content-Type', /image\/png/)
      .expect('Cache-Control', 'public, max-age=31536000, immutable')
      .expect(200)
      .expect((response) => {
        expect(Buffer.compare(response.body as Buffer, png)).toBe(0);
      });
  });

  it('protects Studio writes and rejects bytes that are not a real image', async () => {
    const payload = {
      locale: 'es',
      slug: 'protected-draft',
      title: 'Protected draft',
      excerpt: 'Only Studio may create this.',
    };

    await request(app.getHttpServer())
      .post('/api/blog/admin/posts')
      .send(payload)
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/blog/admin/posts')
      .set('Authorization', `Bearer ${unscopedToken}`)
      .send(payload)
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/blog/admin/assets')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('altText', 'Not really an image')
      .attach('file', Buffer.from('<svg><script>alert(1)</script></svg>'), {
        filename: 'attack.png',
        contentType: 'image/png',
      })
      .expect(400);
  });

  it('publishes a complete draft with its asset and exposes it publicly', async () => {
    const cover = await sharp({
      create: {
        width: 8,
        height: 5,
        channels: 3,
        background: '#112233',
      },
    })
      .webp()
      .toBuffer();
    const asset = await request(app.getHttpServer())
      .post('/api/blog/admin/assets')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('altText', 'Publishing workflow')
      .attach('file', cover, {
        filename: 'publishing.webp',
        contentType: 'image/webp',
      })
      .expect(201);

    const markdown = [
      '# Publishing from Studio',
      '',
      'This post contains a [link](https://example.com), a list, and code.',
      '',
      '- Draft',
      '- Preview',
      '- Publish',
      '',
      '```ts',
      'const state = "published";',
      '```',
    ].join('\n');
    const draft = await request(app.getHttpServer())
      .post('/api/blog/admin/posts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        locale: 'es',
        slug: 'publishing-from-studio',
        title: 'Publishing from Studio',
        excerpt: 'A complete publishing workflow.',
        contentMarkdown: markdown,
        category: 'Engineering',
        tags: ['studio', 'publishing'],
      })
      .expect(201);
    const postId = draft.body.data.id as string;

    await request(app.getHttpServer())
      .get('/api/blog/posts/es/publishing-from-studio')
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/api/blog/admin/posts/${postId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ coverAssetId: asset.body.data.id })
      .expect(200);

    const published = await request(app.getHttpServer())
      .post(`/api/blog/admin/posts/${postId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    expect(published.body.data).toMatchObject({
      status: 'published',
      coverAssetId: asset.body.data.id,
      contentMarkdown: markdown,
      readingTimeMinutes: 1,
    });
    expect(published.body.data.publishedAt).toEqual(expect.any(String));

    await request(app.getHttpServer())
      .get('/api/blog/posts/es/publishing-from-studio')
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toMatchObject({
          status: 'published',
          contentMarkdown: markdown,
          cover: asset.body.data.url,
          readingTimeMinutes: 1,
        });
      });

    await request(app.getHttpServer())
      .delete(`/api/blog/admin/assets/${asset.body.data.id as string}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);

    await request(app.getHttpServer())
      .get('/api/blog/posts/es/publishing-from-studio/comments')
      .expect(404);
    await request(app.getHttpServer())
      .post('/api/blog/posts/es/publishing-from-studio/ratings')
      .send({ value: 5 })
      .expect(404);
    await request(app.getHttpServer())
      .post('/api/blog/posts/es/publishing-from-studio/recommendations')
      .send({})
      .expect(404);

    await request(app.getHttpServer())
      .post(`/api/blog/admin/posts/${postId}/unpublish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201)
      .expect((response) => {
        expect(response.body.data).toMatchObject({
          status: 'draft',
          publishedAt: null,
        });
      });

    await request(app.getHttpServer())
      .get('/api/blog/posts/es/publishing-from-studio')
      .expect(404);
  });

  it('builds public lists, tags and related posts only from published content', async () => {
    const cover = await sharp({
      create: {
        width: 6,
        height: 4,
        channels: 3,
        background: '#224466',
      },
    })
      .jpeg()
      .toBuffer();
    const asset = await request(app.getHttpServer())
      .post('/api/blog/admin/assets')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('altText', 'Related posts cover')
      .attach('file', cover, {
        filename: 'related.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);

    const definitions = [
      {
        slug: 'related-source',
        title: 'Related source',
        tags: ['architecture', 'studio'],
      },
      {
        slug: 'related-strong',
        title: 'Strong relation',
        tags: ['architecture', 'studio'],
      },
      {
        slug: 'related-weak',
        title: 'Weak relation',
        tags: ['studio'],
      },
    ];

    for (const definition of definitions) {
      const draft = await request(app.getHttpServer())
        .post('/api/blog/admin/posts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          locale: 'en',
          slug: definition.slug,
          title: definition.title,
          excerpt: `${definition.title} excerpt.`,
          contentMarkdown: `# ${definition.title}\n\nPublished content.`,
          category: 'Engineering',
          tags: definition.tags,
          coverAssetId: asset.body.data.id,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/blog/admin/posts/${draft.body.data.id as string}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);
    }

    await request(app.getHttpServer())
      .get('/api/blog/posts?locale=en')
      .expect(200)
      .expect((response) => {
        const slugs = response.body.data.map(
          (post: { slug: string }) => post.slug,
        );
        expect(slugs).toEqual(
          expect.arrayContaining(definitions.map(({ slug }) => slug)),
        );
        expect(slugs).not.toContain('editable-draft');
      });

    await request(app.getHttpServer())
      .get('/api/blog/tags?locale=en')
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toEqual(['architecture', 'studio']);
      });

    await request(app.getHttpServer())
      .get('/api/blog/categories?locale=en')
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toEqual(['Engineering']);
      });

    await request(app.getHttpServer())
      .get('/api/blog/posts/en/related-source/related')
      .expect(200)
      .expect((response) => {
        expect(
          response.body.data.map((post: { slug: string }) => post.slug),
        ).toEqual(['related-strong', 'related-weak']);
      });
  });

  it('keeps published posts valid and preserves their publication timestamp on retries', async () => {
    const posts = await request(app.getHttpServer())
      .get('/api/blog/admin/posts?locale=en&status=published')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const post = posts.body.data.find(
      (candidate: { slug: string }) => candidate.slug === 'related-source',
    ) as { id: string; publishedAt: string };

    const retried = await request(app.getHttpServer())
      .post(`/api/blog/admin/posts/${post.id}/publish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);
    expect(retried.body.data.publishedAt).toBe(post.publishedAt);

    await request(app.getHttpServer())
      .patch(`/api/blog/admin/posts/${post.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ contentMarkdown: '' })
      .expect(409);

    await request(app.getHttpServer())
      .get('/api/blog/posts/en/related-source')
      .expect(200)
      .expect((response) => {
        expect(response.body.data.contentMarkdown).toContain(
          'Published content.',
        );
      });
  });

  it('lists filtered drafts and deletes one through the admin contract', async () => {
    const draft = await request(app.getHttpServer())
      .post('/api/blog/admin/posts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        locale: 'en',
        slug: 'temporary-draft',
        title: 'Temporary draft',
        excerpt: 'This draft will be deleted.',
        tags: ['temporary'],
      })
      .expect(201);
    const id = draft.body.data.id as string;

    await request(app.getHttpServer())
      .get('/api/blog/admin/posts?status=draft&locale=en')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id, status: 'draft', locale: 'en' }),
          ]),
        );
      });

    await request(app.getHttpServer())
      .get('/api/blog/admin/tags?locale=en')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toContain('temporary');
      });

    await request(app.getHttpServer())
      .delete(`/api/blog/admin/posts/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect({ success: true, data: { deleted: true } });

    await request(app.getHttpServer())
      .get(`/api/blog/admin/posts/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('lists and deletes an unused asset without leaving public bytes', async () => {
    const jpeg = await sharp({
      create: {
        width: 5,
        height: 5,
        channels: 3,
        background: '#abcdef',
      },
    })
      .jpeg()
      .toBuffer();
    const uploaded = await request(app.getHttpServer())
      .post('/api/blog/admin/assets')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('altText', 'Temporary asset')
      .attach('file', jpeg, {
        filename: 'temporary.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);
    const id = uploaded.body.data.id as string;

    await request(app.getHttpServer())
      .get('/api/blog/admin/assets')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toEqual(
          expect.arrayContaining([expect.objectContaining({ id })]),
        );
      });

    const draft = await request(app.getHttpServer())
      .post('/api/blog/admin/posts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        locale: 'en',
        slug: 'clearable-cover',
        title: 'Clearable cover',
        excerpt: 'Draft covers can be removed before publishing.',
        coverAssetId: id,
      })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/blog/admin/posts/${draft.body.data.id as string}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ coverAssetId: null })
      .expect(200)
      .expect((response) => {
        expect(response.body.data.coverAssetId).toBeNull();
      });
    await request(app.getHttpServer())
      .delete(`/api/blog/admin/posts/${draft.body.data.id as string}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/api/blog/admin/assets/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect({ success: true, data: { deleted: true } });

    await request(app.getHttpServer())
      .get(`/api/blog/assets/${id}`)
      .expect(404);
  });

  it('keeps assets referenced only from Markdown from being deleted', async () => {
    const image = await sharp({
      create: {
        width: 3,
        height: 2,
        channels: 3,
        background: '#445566',
      },
    })
      .png()
      .toBuffer();
    const uploaded = await request(app.getHttpServer())
      .post('/api/blog/admin/assets')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('altText', 'Inline diagram')
      .attach('file', image, {
        filename: 'inline.png',
        contentType: 'image/png',
      })
      .expect(201);
    const assetId = uploaded.body.data.id as string;
    const draft = await request(app.getHttpServer())
      .post('/api/blog/admin/posts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        locale: 'es',
        slug: 'inline-asset-reference',
        title: 'Inline asset reference',
        excerpt: 'An asset embedded inside Markdown.',
        contentMarkdown: `![Inline diagram](${uploaded.body.data.url as string})`,
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/blog/admin/assets/${assetId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);

    await request(app.getHttpServer())
      .delete(`/api/blog/admin/posts/${draft.body.data.id as string}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/api/blog/admin/assets/${assetId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('enforces slug, state-transition and publish-completeness invariants', async () => {
    const payload = {
      locale: 'es',
      slug: 'editorial-invariants',
      title: 'Editorial invariants',
      excerpt: 'The draft is intentionally incomplete.',
    };
    const draft = await request(app.getHttpServer())
      .post('/api/blog/admin/posts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload)
      .expect(201);
    const id = draft.body.data.id as string;

    await request(app.getHttpServer())
      .post('/api/blog/admin/posts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload)
      .expect(409);

    await request(app.getHttpServer())
      .post('/api/blog/admin/posts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...payload, locale: 'en' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/blog/admin/posts/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'published' })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/api/blog/admin/posts/${id}/publish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);
  });

  it('rejects missing, mismatched and oversized-dimension image uploads', async () => {
    await request(app.getHttpServer())
      .post('/api/blog/admin/assets')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('altText', 'Missing file')
      .expect(400);

    const png = await sharp({
      create: {
        width: 2,
        height: 2,
        channels: 3,
        background: '#000000',
      },
    })
      .png()
      .toBuffer();
    await request(app.getHttpServer())
      .post('/api/blog/admin/assets')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('altText', 'MIME mismatch')
      .attach('file', png, {
        filename: 'mismatch.jpg',
        contentType: 'image/jpeg',
      })
      .expect(400);

    const completeJpeg = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: '#123456',
      },
    })
      .jpeg()
      .toBuffer();
    const truncatedJpeg = completeJpeg.subarray(0, completeJpeg.length - 50);
    await request(app.getHttpServer())
      .post('/api/blog/admin/assets')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('altText', 'Truncated JPEG')
      .attach('file', truncatedJpeg, {
        filename: 'truncated.jpg',
        contentType: 'image/jpeg',
      })
      .expect(400);

    const tooWide = await sharp({
      create: {
        width: 8193,
        height: 1,
        channels: 3,
        background: '#000000',
      },
    })
      .png()
      .toBuffer();
    await request(app.getHttpServer())
      .post('/api/blog/admin/assets')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('altText', 'Too wide')
      .attach('file', tooWide, {
        filename: 'too-wide.png',
        contentType: 'image/png',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/blog/admin/assets')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('altText', 'Too many bytes')
      .attach('file', Buffer.alloc(TEST_ASSET_MAX_BYTES + 1), {
        filename: 'too-large.png',
        contentType: 'image/png',
      })
      .expect(413);
  });
});
