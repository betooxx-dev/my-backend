import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from '@nestjs/common';

import { AppModule } from '@/app.module';
import { configureApplication } from '@/configure-application';
import { envs } from '@config/index';
import { getSwaggerStartupMessage } from '@config/swagger';

export async function bootstrap() {
  const logger = new Logger('Main - My Backend API');

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const enableSwagger = envs.stage !== 'prod';
  configureApplication(app, {
    clientUrl: envs.clientUrl,
    enableSwagger,
  });

  await app.listen(envs.port);

  logger.log(`API is running on port: ${envs.port}`);
  const swaggerStartupMessage = getSwaggerStartupMessage(envs.stage, envs.port);
  if (swaggerStartupMessage) logger.log(swaggerStartupMessage);
}

if (require.main === module) void bootstrap();
