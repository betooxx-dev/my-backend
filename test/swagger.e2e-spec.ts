import { Controller } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

import { configureApplication } from '../src/configure-application';
import { isSwaggerEnabled } from '../src/config/swagger';

@Controller('probe')
class SwaggerProbeController {}

async function createApp(stage: 'dev' | 'test' | 'prod') {
  const moduleRef = await Test.createTestingModule({
    controllers: [SwaggerProbeController],
  }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();

  configureApplication(app, {
    clientUrl: 'http://localhost:3000',
    enableSwagger: isSwaggerEnabled(stage),
  });
  await app.init();

  return app;
}

describe('Swagger HTTP exposure (e2e)', () => {
  it.each(['dev', 'test'] as const)('serves /docs in %s', async (stage) => {
    const app = await createApp(stage);

    try {
      await request(app.getHttpServer())
        .get('/docs')
        .expect(200)
        .expect('Content-Type', /html/);
      await request(app.getHttpServer()).get('/docs-json').expect(200);
    } finally {
      await app.close();
    }
  });

  it('does not expose /docs or /docs-json in prod', async () => {
    const app = await createApp('prod');

    try {
      await request(app.getHttpServer()).get('/docs').expect(404);
      await request(app.getHttpServer()).get('/docs-json').expect(404);
    } finally {
      await app.close();
    }
  });
});
