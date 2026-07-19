import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from '@nestjs/common';

import { AppModule } from '@/app.module';
import { configureApplication } from '@/configure-application';
import { envs } from '@config/index';

async function bootstrap() {
  const logger = new Logger('Main - Argos API');

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  configureApplication(app, { clientUrl: envs.clientUrl });

  await app.listen(envs.port);

  logger.log(`API is running on port: ${envs.port}`);
  logger.log(`Swagger docs available at: http://localhost:${envs.port}/docs`);
}
void bootstrap();
