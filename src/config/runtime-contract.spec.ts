import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type PackageManifest = {
  engines?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const repositoryRoot = resolve(__dirname, '../..');
const manifest = JSON.parse(
  readFileSync(resolve(repositoryRoot, 'package.json'), 'utf8'),
) as PackageManifest;

describe('runtime contract', () => {
  it('declares the supported Node.js and npm ranges', () => {
    expect(manifest.engines).toEqual({
      node: '>=22.19.0 <23',
      npm: '>=10.9.0 <11',
    });
  });

  it('pins the local runtime and enforces engines during installs', () => {
    expect(readFileSync(resolve(repositoryRoot, '.nvmrc'), 'utf8').trim()).toBe(
      '22.19.0',
    );
    expect(readFileSync(resolve(repositoryRoot, '.npmrc'), 'utf8').trim()).toBe(
      'engine-strict=true',
    );
  });

  it('keeps the Node.js type declarations on the supported major', () => {
    expect(manifest.devDependencies?.['@types/node']).toMatch(/^\^22\./);
  });
});
