import {
  DeleteObjectCommand,
  GetObjectCommand,
  GetObjectCommandOutput,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { S3ClientConfig } from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';

import { BlogAssetStorage, PutBlogAssetInput } from './blog-asset-storage';

type R2Command = PutObjectCommand | GetObjectCommand | DeleteObjectCommand;

export interface R2CommandSender {
  send(command: R2Command): Promise<unknown>;
}

export interface R2BlogAssetStorageOptions {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
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

    const s3 = createR2S3Client(options);
    this.client = {
      send: (command) => s3.send(command),
    };
  }

  async put(input: PutBlogAssetInput): Promise<void> {
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
}
