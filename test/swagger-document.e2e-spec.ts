import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { configureApplication } from '../src/configure-application';
import { AdminBlogsController } from '../src/modules/blogs/admin-blogs.controller';
import { BlogsController } from '../src/modules/blogs/blogs.controller';
import {
  AdminBlogAssetsController,
  PublicBlogAssetsController,
} from '../src/modules/blogs/assets/blog-assets.controller';
import { BlogAssetsService } from '../src/modules/blogs/assets/blog-assets.service';
import { BlogCategoriesController } from '../src/modules/blogs/categories/blog-categories.controller';
import { BlogCategoriesService } from '../src/modules/blogs/categories/blog-categories.service';
import { AdminBlogsService } from '../src/modules/blogs/admin-blogs.service';
import { BlogsService } from '../src/modules/blogs/blogs.service';
import { HealthController } from '../src/modules/health/health.controller';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';

@Module({
  controllers: [
    BlogsController,
    AdminBlogsController,
    BlogCategoriesController,
    AdminBlogAssetsController,
    PublicBlogAssetsController,
    HealthController,
  ],
  providers: [
    { provide: BlogsService, useValue: {} },
    { provide: AdminBlogsService, useValue: {} },
    { provide: BlogCategoriesService, useValue: {} },
    { provide: BlogAssetsService, useValue: {} },
    { provide: HealthCheckService, useValue: {} },
    { provide: TypeOrmHealthIndicator, useValue: {} },
  ],
})
class SwaggerTestModule {}

describe('generated OpenAPI document', () => {
  it('keeps the public/admin surface and response schemas discoverable', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SwaggerTestModule],
    }).compile();
    const app = moduleRef.createNestApplication<NestExpressApplication>();

    configureApplication(app, {
      clientUrl: 'http://localhost:3000',
      enableSwagger: false,
    });
    await app.init();

    try {
      const document = SwaggerModule.createDocument(
        app,
        new DocumentBuilder()
          .setTitle('My Backend API')
          .setDescription('API for Alberto personal tools and automations')
          .setVersion('1.0')
          .addTag('blog', 'Public blog endpoints')
          .addTag('blog-admin', 'Administrative blog endpoints')
          .addTag('blog-admin-categories', 'Administrative category endpoints')
          .addTag('blog-admin-assets', 'Administrative asset endpoints')
          .addTag('blog-assets', 'Public asset endpoints')
          .addTag('health', 'Liveness and readiness endpoints')
          .addBearerAuth(
            {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'ApiKey',
              description: 'Bearer token — API key generated via CLI scripts',
            },
            'api-key',
          )
          .build(),
        { include: [SwaggerTestModule], deepScanRoutes: true },
      );
      expect({
        tags: document.tags?.map(({ name }) => name).sort(),
        paths: Object.fromEntries(
          Object.entries(document.paths ?? {})
            .filter(([path]) => path.startsWith('/api/'))
            .map(([path, operations]) => [
              path,
              Object.keys(operations).sort(),
            ]),
        ),
        securitySchemes: document.components?.securitySchemes,
        responseSchemas: Object.keys(document.components?.schemas ?? {})
          .filter((name) => name.endsWith('ResponseDto'))
          .sort(),
      }).toMatchSnapshot();

      const adminPostCreate = document.paths?.['/api/blog/admin/posts']
        ?.post as
        | {
            security?: unknown;
            responses?: Record<string, unknown>;
          }
        | undefined;
      const publicPosts = document.paths?.['/api/blog/posts']?.get as
        | { security?: unknown }
        | undefined;
      const readiness = document.paths?.['/api/health/ready']?.get as
        | { responses?: Record<string, unknown> }
        | undefined;

      expect(adminPostCreate?.security).toEqual([{ 'api-key': [] }]);
      expect(publicPosts?.security).toBeUndefined();
      expect(Object.keys(adminPostCreate?.responses ?? {})).toEqual(
        expect.arrayContaining(['201', '400', '401', '403', '404', '409']),
      );
      expect(readiness?.responses).toHaveProperty('503');
    } finally {
      await app.close();
    }
  });
});
