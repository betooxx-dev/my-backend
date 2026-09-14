import { createReadStream } from 'node:fs';
import {
  mkdir,
  readdir,
  rename,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';

import type {
  BlogAssetStorage,
  BlogAssetStoragePage,
  PutBlogAssetInput,
} from './blog-asset-storage';

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

  async list(
    prefix = '',
    continuationToken?: string,
    maxKeys = 1000,
  ): Promise<BlogAssetStoragePage> {
    if (!Number.isSafeInteger(maxKeys) || maxKeys < 1) {
      throw new Error('Storage page size must be positive');
    }

    const directory = this.resolveDirectory(prefix);
    const keys = await this.collectKeys(directory);
    const start = continuationToken
      ? Math.max(
          keys.findIndex((key) => key > continuationToken),
          0,
        )
      : 0;
    const pageKeys = keys.slice(start, start + maxKeys);
    const objects = await Promise.all(
      pageKeys.map(async (key) => {
        const file = await stat(this.resolveKey(key));
        return {
          key,
          sizeBytes: file.size,
          lastModified: file.mtime,
        };
      }),
    );

    return {
      objects,
      nextContinuationToken:
        start + pageKeys.length < keys.length
          ? pageKeys[pageKeys.length - 1]
          : undefined,
    };
  }

  private resolveKey(key: string): string {
    const target = resolve(this.root, key);
    if (!target.startsWith(`${this.root}${sep}`)) {
      throw new Error('Asset key escapes the configured storage directory');
    }
    return target;
  }

  private resolveDirectory(prefix: string): string {
    const target = resolve(this.root, prefix);
    if (target !== this.root && !target.startsWith(`${this.root}${sep}`)) {
      throw new Error('Asset prefix escapes the configured storage directory');
    }
    return target;
  }

  private async collectKeys(directory: string): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true }).catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return [];
        throw error;
      },
    );
    const keys: string[] = [];
    for (const entry of entries) {
      const file = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        keys.push(...(await this.collectKeys(file)));
      } else if (entry.isFile()) {
        keys.push(relative(this.root, file).split(sep).join('/'));
      }
    }
    return keys.sort();
  }
}
