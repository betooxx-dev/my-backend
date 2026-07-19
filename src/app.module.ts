import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { envs, envsSchema } from '@config/index';
import { AllExceptionsFilter, TransformInterceptor } from '@common/index';
import { LoggerMiddleware } from '@common/middleware/logger.middleware';
import { BlogsModule } from '@/modules/blogs/blogs.module';
import { ApiKeysModule } from '@/modules/api-keys/api-keys.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envsSchema,
      validationOptions: {
        abortEarly: true,
        allowUnknown: true,
      },
    }),
    TypeOrmModule.forRoot({
      ssl: envs.stage === 'prod',
      extra: {
        ssl:
          envs.stage === 'prod'
            ? {
                rejectUnauthorized: envs.dbSslRejectUnauthorized,
                ...(envs.dbSslCa ? { ca: envs.dbSslCa } : {}),
              }
            : false,
      },
      type: 'postgres',
      host: envs.dbHost,
      port: envs.dbPort,
      database: envs.dbName,
      username: envs.dbUser,
      password: envs.dbPassword,
      autoLoadEntities: true,
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      migrationsRun: envs.stage === 'prod' || envs.stage === 'test',
      synchronize: envs.stage === 'dev',
    }),
    ApiKeysModule,
    BlogsModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
