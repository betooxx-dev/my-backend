import {
  DeleteObjectCommand,
  GetObjectCommand,
  GetObjectCommandOutput,
  ListObjectsV2Command,
  ListObjectsV2CommandOutput,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { S3ClientConfig } from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';

import type {
  BlogAssetStorage,
  BlogAssetStoragePage,
  PutBlogAssetInput,
} from './blog-asset-storage';

type R2Command =
  | PutObjectCommand
  | GetObjectCommand
  | DeleteObjectCommand
  | ListObjectsV2Command;

export interface R2CommandSender {
  send(command: R2Command): Promise<unknown>;
}

export interface R2BlogAssetStorageOptions {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export function createR2CommandSender(
  options: R2BlogAssetStorageOptions,
  requestHandler?: S3ClientConfig['requestHandler'],
): R2CommandSender {
  const s3 = createR2S3Client(options, requestHandler);
  return {
    send: (command) => s3.send(command as never),
  };
}

export function createR2S3Client(
  options: R2BlogAssetStorageOptions,
  requestHandler?: S3ClientConfig['requestHandler'],
): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${options.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
    },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    ...(requestHandler ? { requestHandler } : {}),
  });
}

export class R2BlogAssetStorage implements BlogAssetStorage {
  private readonly client: R2CommandSender;

  constructor(
    private readonly options: R2BlogAssetStorageOptions,
    client?: R2CommandSender,
  ) {
    if (client) {
      this.client = client;
      return;
    }

    this.client = createR2CommandSender(options);
  }

  async put(input: PutBlogAssetInput): Promise<void> {
    // Keep the application checksum in PostgreSQL. Cloudflare R2 documents
    // SHA-256 as unsupported for FULL_OBJECT uploads, so do not send the
    // S3 ChecksumSHA256 header until a development R2 smoke proves support.
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.options.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
  }

  async read(key: string): Promise<Readable> {
    const result = (await this.client.send(
      new GetObjectCommand({ Bucket: this.options.bucket, Key: key }),
    )) as GetObjectCommandOutput;
    const body = result.Body;
    if (!body) throw new Error('R2 returned an empty object body');
    if (body instanceof Readable) return body;

    const bytes = await body.transformToByteArray();
    return Readable.from(Buffer.from(bytes));
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.options.bucket, Key: key }),
    );
  }

  async list(
    prefix = 'blog/',
    continuationToken?: string,
    maxKeys = 1000,
  ): Promise<BlogAssetStoragePage> {
    if (!Number.isSafeInteger(maxKeys) || maxKeys < 1) {
      throw new Error('Storage page size must be positive');
    }

    const result = (await this.client.send(
      new ListObjectsV2Command({
        Bucket: this.options.bucket,
        Prefix: prefix,
        ...(continuationToken ? { ContinuationToken: continuationToken } : {}),
        MaxKeys: maxKeys,
      }),
    )) as ListObjectsV2CommandOutput;

    return {
      objects: (result.Contents ?? []).flatMap((object) =>
        object.Key
          ? [
              {
                key: object.Key,
                ...(object.Size === undefined
                  ? {}
                  : { sizeBytes: object.Size }),
                ...(object.LastModified === undefined
                  ? {}
                  : { lastModified: object.LastModified }),
              },
            ]
          : [],
      ),
      nextContinuationToken: result.IsTruncated
        ? result.NextContinuationToken
        : undefined,
    };
  }
}
