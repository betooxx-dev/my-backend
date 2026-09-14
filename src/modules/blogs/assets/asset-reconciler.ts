import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BlogAsset } from '../entities';
import { BLOG_ASSET_STORAGE } from './blog-asset-storage';
import type {
  BlogAssetStorage,
  BlogAssetStorageObject,
} from './blog-asset-storage';

export const DEFAULT_ASSET_RECONCILIATION_PREFIX = 'blog/';
export const DEFAULT_ASSET_RECONCILIATION_SAFETY_WINDOW_MS =
  24 * 60 * 60 * 1000;
const DEFAULT_PAGE_SIZE = 1000;

export interface AssetReconciliationOptions {
  prefix?: string;
  dryRun?: boolean;
  now?: Date;
  safetyWindowMs?: number;
  pageSize?: number;
}

export interface AssetReconciliationReport {
  dryRun: boolean;
  prefix: string;
  pages: number;
  databaseRows: number;
  storageObjects: number;
  orphanObjects: string[];
  missingRows: string[];
  protectedOrphans: string[];
  deletedObjects: string[];
}

@Injectable()
export class AssetReconciler {
  constructor(
    @InjectRepository(BlogAsset)
    private readonly assets: Repository<BlogAsset>,
    @Inject(BLOG_ASSET_STORAGE)
    private readonly storage: BlogAssetStorage,
  ) {}

  async reconcile(
    options: AssetReconciliationOptions = {},
  ): Promise<AssetReconciliationReport> {
    const prefix = options.prefix ?? DEFAULT_ASSET_RECONCILIATION_PREFIX;
    const dryRun = options.dryRun ?? true;
    const now = options.now ?? new Date();
    const safetyWindowMs =
      options.safetyWindowMs ?? DEFAULT_ASSET_RECONCILIATION_SAFETY_WINDOW_MS;
    const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
    const databaseRows = await this.assets.find({
      select: { storageKey: true },
    });
    const storageObjects = await this.listAll(prefix, pageSize);
    const rows = new Set(databaseRows.map((row) => row.storageKey));
    const objects = new Map(
      storageObjects.map((object) => [object.key, object]),
    );
    const orphanObjects = [...objects.keys()]
      .filter((key) => !rows.has(key))
      .sort();
    const missingRows = [...rows].filter((key) => !objects.has(key)).sort();
    const protectedOrphans = orphanObjects.filter((key) =>
      this.isProtected(objects.get(key), now, safetyWindowMs),
    );
    const deletableObjects = orphanObjects.filter(
      (key) => !protectedOrphans.includes(key),
    );
    const deletedObjects: string[] = [];

    if (!dryRun) {
      for (const key of deletableObjects) {
        await this.storage.delete(key);
        deletedObjects.push(key);
      }
    }

    return {
      dryRun,
      prefix,
      pages: storageObjects.pages,
      databaseRows: databaseRows.length,
      storageObjects: objects.size,
      orphanObjects,
      missingRows,
      protectedOrphans,
      deletedObjects,
    };
  }

  private async listAll(
    prefix: string,
    pageSize: number,
  ): Promise<BlogAssetStorageObject[] & { pages: number }> {
    if (!Number.isSafeInteger(pageSize) || pageSize < 1) {
      throw new Error('Asset reconciliation page size must be positive');
    }

    const objects: BlogAssetStorageObject[] = [];
    let continuationToken: string | undefined;
    const seenTokens = new Set<string>();
    let pages = 0;

    while (true) {
      const page = await this.storage.list(prefix, continuationToken, pageSize);
      pages += 1;
      objects.push(...page.objects);
      const nextToken = page.nextContinuationToken;
      if (!nextToken) break;
      if (seenTokens.has(nextToken)) {
        throw new Error(
          'Storage pagination returned a repeated continuation token',
        );
      }
      seenTokens.add(nextToken);
      continuationToken = nextToken;
    }

    return Object.assign(objects, { pages });
  }

  private isProtected(
    object: BlogAssetStorageObject | undefined,
    now: Date,
    safetyWindowMs: number,
  ): boolean {
    if (!object?.lastModified) return true;
    return now.getTime() - object.lastModified.getTime() < safetyWindowMs;
  }
}
