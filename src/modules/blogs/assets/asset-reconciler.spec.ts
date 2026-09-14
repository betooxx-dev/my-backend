import { Repository } from 'typeorm';

import { BlogAsset } from '../entities';
import type {
  BlogAssetStorage,
  BlogAssetStoragePage,
} from './blog-asset-storage';
import { AssetReconciler } from './asset-reconciler';

describe('AssetReconciler', () => {
  const now = new Date('2026-09-14T12:00:00.000Z');
  const old = new Date('2026-09-12T12:00:00.000Z');
  const recent = new Date('2026-09-14T11:30:00.000Z');

  function makeReconciler(pages: BlogAssetStoragePage[]): {
    reconciler: AssetReconciler;
    list: jest.Mock;
    remove: jest.Mock;
  } {
    const list = jest.fn();
    pages.forEach((page) => list.mockResolvedValueOnce(page));
    const remove = jest.fn().mockResolvedValue(undefined);
    const storage = { list, delete: remove } as unknown as BlogAssetStorage;
    const repository = {
      find: jest
        .fn()
        .mockResolvedValue([
          { storageKey: 'blog/known.png' },
          { storageKey: 'blog/missing.png' },
        ]),
    } as unknown as Repository<BlogAsset>;

    return {
      reconciler: new AssetReconciler(repository, storage),
      list,
      remove,
    };
  }

  it('reports all discrepancies, paginates, and is dry-run by default', async () => {
    const { reconciler, list, remove } = makeReconciler([
      {
        objects: [
          { key: 'blog/known.png', lastModified: old },
          { key: 'blog/orphan-recent.png', lastModified: recent },
        ],
        nextContinuationToken: 'page-2',
      },
      {
        objects: [
          { key: 'blog/orphan-old.png', lastModified: old },
          { key: 'blog/orphan-unknown.png' },
        ],
      },
    ]);

    const report = await reconciler.reconcile({
      now,
      pageSize: 2,
      safetyWindowMs: 24 * 60 * 60 * 1000,
    });

    expect(report).toEqual({
      dryRun: true,
      prefix: 'blog/',
      pages: 2,
      databaseRows: 2,
      storageObjects: 4,
      orphanObjects: [
        'blog/orphan-old.png',
        'blog/orphan-recent.png',
        'blog/orphan-unknown.png',
      ],
      missingRows: ['blog/missing.png'],
      protectedOrphans: ['blog/orphan-recent.png', 'blog/orphan-unknown.png'],
      deletedObjects: [],
    });
    expect(list).toHaveBeenNthCalledWith(1, 'blog/', undefined, 2);
    expect(list).toHaveBeenNthCalledWith(2, 'blog/', 'page-2', 2);
    expect(remove).not.toHaveBeenCalled();
  });

  it('deletes only old orphan objects when deletion is explicitly enabled', async () => {
    const { reconciler, remove } = makeReconciler([
      {
        objects: [
          { key: 'blog/orphan-old.png', lastModified: old },
          { key: 'blog/orphan-recent.png', lastModified: recent },
          { key: 'blog/orphan-unknown.png' },
        ],
      },
    ]);

    const report = await reconciler.reconcile({
      now,
      dryRun: false,
      safetyWindowMs: 24 * 60 * 60 * 1000,
    });

    expect(report.deletedObjects).toEqual(['blog/orphan-old.png']);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith('blog/orphan-old.png');
  });

  it('rejects a repeated continuation token instead of looping', async () => {
    const { reconciler } = makeReconciler([
      {
        objects: [],
        nextContinuationToken: 'same-token',
      },
      {
        objects: [],
        nextContinuationToken: 'same-token',
      },
    ]);

    await expect(reconciler.reconcile()).rejects.toThrow(
      'Storage pagination returned a repeated continuation token',
    );
  });
});
