import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

interface ConfigureApplicationOptions {
  clientUrl: string;
  enableSwagger?: boolean;
}

export function configureApplication(
  app: NestExpressApplication,
  options: ConfigureApplicationOptions,
): void {
  app.enableCors({
    origin: options.clientUrl,
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useBodyParser('json', { limit: '256kb' });
  app.useBodyParser('urlencoded', { extended: true, limit: '256kb' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  if (options.enableSwagger === false) return;

  const config = new DocumentBuilder()
    .setTitle('My Backend API')
    .setDescription('API for Alberto personal tools and automations')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'ApiKey',
        description: 'Bearer token — API key generated via CLI scripts',
      },
      'api-key',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
}
