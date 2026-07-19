import { createReadStream } from 'node:fs';
import { mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';

import { BlogAssetStorage, PutBlogAssetInput } from './blog-asset-storage';

export class LocalBlogAssetStorage implements BlogAssetStorage {
  private readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  async put(input: PutBlogAssetInput): Promise<void> {
    const target = this.resolveKey(input.key);
    const temporary = `${target}.${randomUUID()}.tmp`;
    await mkdir(dirname(target), { recursive: true });

    try {
      await writeFile(temporary, input.body, { flag: 'wx' });
      await rename(temporary, target);
    } catch (error) {
      await unlink(temporary).catch(() => undefined);
      throw error;
    }
  }

  read(key: string): Promise<Readable> {
    return Promise.resolve(createReadStream(this.resolveKey(key)));
  }

  async delete(key: string): Promise<void> {
    await unlink(this.resolveKey(key)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }

  private resolveKey(key: string): string {
    const target = resolve(this.root, key);
    if (!target.startsWith(`${this.root}${sep}`)) {
      throw new Error('Asset key escapes the configured storage directory');
    }
    return target;
  }
}
