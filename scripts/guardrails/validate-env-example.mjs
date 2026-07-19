import { readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const examplePath = path.join(root, '.env.example');
const example = readFileSync(examplePath, 'utf8');
const values = {};

for (const rawLine of example.split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line || line.startsWith('#')) continue;

  const separator = line.indexOf('=');
  if (separator < 1) {
    console.error(`[validate:env-example] Invalid assignment: ${rawLine}`);
    process.exit(1);
  }

  const key = line.slice(0, separator).trim();
  const value = line.slice(separator + 1).trim();
  if (!/^[A-Z][A-Z0-9_]*$/.test(key)) {
    console.error(`[validate:env-example] Invalid variable name: ${key}`);
    process.exit(1);
  }
  values[key] = value;
}

const validationCommand = [
  '-r',
  'ts-node/register',
  '-r',
  'tsconfig-paths/register',
  '-e',
  "require('./src/config/envs')",
];

function validate(label, overrides, shouldPass) {
  const result = spawnSync(process.execPath, validationCommand, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, ...values, ...overrides },
  });
  const passed = result.status === 0;

  if (passed === shouldPass) return;

  console.error(
    `[validate:env-example] ${label} ${
      shouldPass ? 'failed validation' : 'unexpectedly passed validation'
    }.`,
  );
  if (result.stderr) console.error(result.stderr.trim());
  process.exit(1);
}

validate('local configuration', { BLOG_ASSET_DRIVER: 'local' }, true);

const r2Values = {
  BLOG_ASSET_DRIVER: 'r2',
  R2_ACCOUNT_ID: 'example-account',
  R2_BUCKET: 'example-bucket',
  R2_ACCESS_KEY_ID: 'example-access-key',
  R2_SECRET_ACCESS_KEY: 'example-secret-key',
};

validate('complete R2 configuration', r2Values, true);
validate(
  'production R2 configuration',
  {
    ...r2Values,
    STAGE: 'prod',
    API_PUBLIC_URL: 'https://api.example.com/api',
  },
  true,
);
validate(
  'incomplete R2 configuration',
  { ...r2Values, R2_SECRET_ACCESS_KEY: '' },
  false,
);
validate(
  'production local storage configuration',
  {
    STAGE: 'prod',
    API_PUBLIC_URL: 'https://api.example.com/api',
    BLOG_ASSET_DRIVER: 'local',
  },
  false,
);

console.log(
  '[validate:env-example] OK: example, local, and conditional R2 configuration are valid.',
);
