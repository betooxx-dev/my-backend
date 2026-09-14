import * as joi from 'joi';

export const envsSchema = joi
  .object({
    STAGE: joi.string().valid('dev', 'test', 'prod').default('dev'),
    PORT: joi.number().default(5000),
    CLIENT_URL: joi.string().uri({ allowRelative: false }).required(),
    DB_HOST: joi.string().required(),
    DB_PORT: joi.number().port().required(),
    DB_USER: joi.string().required(),
    DB_PASSWORD: joi.string().required(),
    DB_NAME: joi.string().required(),
    DB_SSL_REJECT_UNAUTHORIZED: joi.boolean().default(true),
    DB_SSL_CA: joi.string().optional(),
    JWT_SECRET: joi.string().min(32).required(),
    API_KEY_PREFIX: joi
      .string()
      .pattern(/^[a-z0-9]+_$/)
      .default('mybackend_'),
    THROTTLE_TTL_MS: joi.number().integer().min(1).default(60_000),
    THROTTLE_LIMIT: joi.number().integer().min(1).default(120),
    API_PUBLIC_URL: joi.when('STAGE', {
      is: 'prod',
      then: joi.string().uri({ allowRelative: false }).required(),
      otherwise: joi
        .string()
        .uri({ allowRelative: false })
        .default('http://localhost:5000/api'),
    }),
    BLOG_ASSET_DRIVER: joi.when('STAGE', {
      is: 'prod',
      then: joi.string().valid('r2').required(),
      otherwise: joi.string().valid('local', 'r2').default('local'),
    }),
    BLOG_ASSET_LOCAL_DIR: joi.string().default('.local/blog-assets'),
    BLOG_ASSET_MAX_BYTES: joi
      .number()
      .integer()
      .min(1)
      .default(8 * 1024 * 1024),
    R2_ACCOUNT_ID: joi.when('BLOG_ASSET_DRIVER', {
      is: 'r2',
      then: joi.string().required(),
      otherwise: joi.string().optional(),
    }),
    R2_BUCKET: joi.when('BLOG_ASSET_DRIVER', {
      is: 'r2',
      then: joi.string().required(),
      otherwise: joi.string().optional(),
    }),
    R2_ACCESS_KEY_ID: joi.when('BLOG_ASSET_DRIVER', {
      is: 'r2',
      then: joi.string().required(),
      otherwise: joi.string().optional(),
    }),
    R2_SECRET_ACCESS_KEY: joi.when('BLOG_ASSET_DRIVER', {
      is: 'r2',
      then: joi.string().required(),
      otherwise: joi.string().optional(),
    }),
  })
  .unknown(true);
