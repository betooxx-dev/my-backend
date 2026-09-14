import { Readable } from 'node:stream';

export const BLOG_ASSET_STORAGE = Symbol('BLOG_ASSET_STORAGE');

export interface PutBlogAssetInput {
  key: string;
  body: Buffer;
  contentType: string;
  checksumSha256: string;
}

export interface BlogAssetStorageObject {
  key: string;
  sizeBytes?: number;
  lastModified?: Date;
  checksumSha256?: string;
}

export interface BlogAssetStoragePage {
  objects: BlogAssetStorageObject[];
  nextContinuationToken?: string;
}

export interface BlogAssetStorage {
  put(input: PutBlogAssetInput): Promise<void>;
  read(key: string): Promise<Readable>;
  delete(key: string): Promise<void>;
  list(
    prefix?: string,
    continuationToken?: string,
    maxKeys?: number,
  ): Promise<BlogAssetStoragePage>;
}
