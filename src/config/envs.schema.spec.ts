import { envsSchema } from './envs.schema';

const validEnv = {
  CLIENT_URL: 'http://localhost:3000',
  DB_HOST: 'localhost',
  DB_PORT: 5432,
  DB_USER: 'postgres',
  DB_PASSWORD: 'postgres',
  DB_NAME: 'argos',
  JWT_SECRET: 'a'.repeat(32),
};

describe('envsSchema', () => {
  it('applies safe defaults for optional runtime settings', () => {
    const result = envsSchema.validate(validEnv);

    expect(result.error).toBeUndefined();
    expect(result.value as Record<string, unknown>).toMatchObject({
      STAGE: 'dev',
      PORT: 5000,
      API_KEY_PREFIX: 'argos_',
      DB_SSL_REJECT_UNAUTHORIZED: true,
    });
  });

  it('rejects weak JWT secrets', () => {
    const result = envsSchema.validate({
      ...validEnv,
      JWT_SECRET: 'too-short',
    });

    expect(result.error?.message).toContain('JWT_SECRET');
  });

  it('rejects invalid API key prefixes', () => {
    const result = envsSchema.validate({
      ...validEnv,
      API_KEY_PREFIX: 'Argos',
    });

    expect(result.error?.message).toContain('API_KEY_PREFIX');
  });

  it('requires explicit R2 storage and a public API URL in production', () => {
    const localStorage = envsSchema.validate({
      ...validEnv,
      STAGE: 'prod',
      API_PUBLIC_URL: 'https://api.example.com/api',
      BLOG_ASSET_DRIVER: 'local',
    });
    expect(localStorage.error?.message).toContain('BLOG_ASSET_DRIVER');

    const missingPublicUrl = envsSchema.validate({
      ...validEnv,
      STAGE: 'prod',
      BLOG_ASSET_DRIVER: 'r2',
      R2_ACCOUNT_ID: 'account',
      R2_BUCKET: 'bucket',
      R2_ACCESS_KEY_ID: 'key',
      R2_SECRET_ACCESS_KEY: 'secret',
    });
    expect(missingPublicUrl.error?.message).toContain('API_PUBLIC_URL');
  });
});
