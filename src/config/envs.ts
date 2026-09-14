import 'dotenv/config';
import type { ValidationResult } from 'joi';

import { envsSchema } from './envs.schema';

interface EnvVars {
  STAGE: 'dev' | 'test' | 'prod';
  PORT: number;
  CLIENT_URL: string;
  DB_HOST: string;
  DB_PORT: number;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  DB_SSL_REJECT_UNAUTHORIZED: boolean;
  DB_SSL_CA?: string;
  JWT_SECRET: string;
  API_KEY_PREFIX: string;
  THROTTLE_TTL_MS: number;
  THROTTLE_LIMIT: number;
  API_PUBLIC_URL: string;
  BLOG_ASSET_DRIVER: 'local' | 'r2';
  BLOG_ASSET_LOCAL_DIR: string;
  BLOG_ASSET_MAX_BYTES: number;
  R2_ACCOUNT_ID?: string;
  R2_BUCKET?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
}

const validation = envsSchema.validate(
  process.env,
) as ValidationResult<EnvVars>;

if (validation.error) {
  throw new Error(`Config validation error: ${validation.error.message}`);
}

const envVars = validation.value;

export const envs = {
  stage: envVars.STAGE,
  port: envVars.PORT,
  clientUrl: envVars.CLIENT_URL,
  dbHost: envVars.DB_HOST,
  dbPort: envVars.DB_PORT,
  dbUser: envVars.DB_USER,
  dbPassword: envVars.DB_PASSWORD,
  dbName: envVars.DB_NAME,
  dbSslRejectUnauthorized: envVars.DB_SSL_REJECT_UNAUTHORIZED,
  dbSslCa: envVars.DB_SSL_CA?.replace(/\\n/g, '\n'),
  jwtSecret: envVars.JWT_SECRET,
  apiKeyPrefix: envVars.API_KEY_PREFIX,
  throttleTtlMs: envVars.THROTTLE_TTL_MS,
  throttleLimit: envVars.THROTTLE_LIMIT,
  apiPublicUrl: envVars.API_PUBLIC_URL.replace(/\/$/, ''),
  blogAssetDriver: envVars.BLOG_ASSET_DRIVER,
  blogAssetLocalDir: envVars.BLOG_ASSET_LOCAL_DIR,
  blogAssetMaxBytes: envVars.BLOG_ASSET_MAX_BYTES,
  r2AccountId: envVars.R2_ACCOUNT_ID,
  r2Bucket: envVars.R2_BUCKET,
  r2AccessKeyId: envVars.R2_ACCESS_KEY_ID,
  r2SecretAccessKey: envVars.R2_SECRET_ACCESS_KEY,
};
