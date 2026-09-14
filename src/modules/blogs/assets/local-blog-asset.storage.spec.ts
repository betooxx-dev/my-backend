import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { LocalBlogAssetStorage } from './local-blog-asset.storage';

describe('LocalBlogAssetStorage.list', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'my-backend-assets-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('lists nested objects in deterministic pages with metadata', async () => {
    const storage = new LocalBlogAssetStorage(root);
    const input = {
      body: Buffer.from('asset'),
      contentType: 'image/png',
      checksumSha256: 'a'.repeat(64),
    };
    await storage.put({ ...input, key: 'blog/2026/09/b.png' });
    await storage.put({ ...input, key: 'blog/2026/09/a.png' });
    await storage.put({ ...input, key: 'other/ignored.png' });

    const first = await storage.list('blog/', undefined, 1);
    const second = await storage.list('blog/', first.nextContinuationToken, 1);

    expect(first.objects).toHaveLength(1);
    expect(first.objects[0]).toMatchObject({ key: 'blog/2026/09/a.png' });
    expect(first.objects[0]?.sizeBytes).toBe(5);
    expect(first.objects[0]?.lastModified?.getTime()).toEqual(
      expect.any(Number),
    );
    expect(second.objects).toEqual([
      expect.objectContaining({ key: 'blog/2026/09/b.png' }),
    ]);
    expect(second.nextContinuationToken).toBeUndefined();
  });
});
