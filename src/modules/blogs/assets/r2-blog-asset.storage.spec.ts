import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import type { HttpRequest, HttpResponse, RequestHandler } from '@smithy/types';
import { Readable } from 'node:stream';

import { createR2S3Client, R2BlogAssetStorage } from './r2-blog-asset.storage';

describe('R2BlogAssetStorage', () => {
  it('implements the storage contract through the S3-compatible client', async () => {
    const sent: unknown[] = [];
    const client = {
      send: jest.fn((command: unknown) => {
        sent.push(command);
        if (command instanceof GetObjectCommand) {
          return Promise.resolve({
            Body: Readable.from(Buffer.from('stored-image')),
          });
        }
        return Promise.resolve({});
      }),
    };
    const storage = new R2BlogAssetStorage(
      {
        accountId: 'account',
        bucket: 'blog-assets',
        accessKeyId: 'access-key',
        secretAccessKey: 'secret-key',
      },
      client,
    );

    await storage.put({
      key: 'blog/asset.png',
      body: Buffer.from('stored-image'),
      contentType: 'image/png',
      checksumSha256: 'a'.repeat(64),
    });
    const stream = await storage.read('blog/asset.png');
    const chunks: Buffer[] = [];
    for await (const chunk of stream as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.from(chunk));
    }
    await storage.delete('blog/asset.png');

    expect(Buffer.concat(chunks).toString()).toBe('stored-image');
    expect(sent[0]).toBeInstanceOf(PutObjectCommand);
    expect((sent[0] as PutObjectCommand).input).toMatchObject({
      Bucket: 'blog-assets',
      Key: 'blog/asset.png',
      ContentType: 'image/png',
    });
    expect((sent[0] as PutObjectCommand).input).not.toHaveProperty(
      'ChecksumSHA256',
    );
    expect(sent[1]).toBeInstanceOf(GetObjectCommand);
    expect(sent[2]).toBeInstanceOf(DeleteObjectCommand);
    expect(client.send).toHaveBeenCalledTimes(3);
  });

  it('serializes uploads without flexible checksum headers', async () => {
    let serializedHeaders: Record<string, string> = {};
    const requestHandler: RequestHandler<HttpRequest, HttpResponse> = {
      handle: jest.fn((request) => {
        serializedHeaders = request.headers;
        return Promise.resolve({
          response: {
            statusCode: 200,
            headers: {},
          },
        });
      }),
    };
    const options = {
      accountId: 'account',
      bucket: 'blog-assets',
      accessKeyId: 'access-key',
      secretAccessKey: 'secret-key',
    };
    const client = createR2S3Client(options, requestHandler);
    const storage = new R2BlogAssetStorage(options, client);

    await storage.put({
      key: 'blog/asset.png',
      body: Buffer.from('stored-image'),
      contentType: 'image/png',
      checksumSha256: 'a'.repeat(64),
    });

    expect(
      Object.keys(serializedHeaders).filter((header) =>
        header.toLowerCase().startsWith('x-amz-checksum'),
      ),
    ).toEqual([]);
    expect(serializedHeaders).not.toHaveProperty(
      'x-amz-sdk-checksum-algorithm',
    );
  });
});
