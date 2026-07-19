import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'node:crypto';
import { basename } from 'node:path';
import { Readable } from 'node:stream';
import sharp from 'sharp';
import { Like, Repository } from 'typeorm';

import { envs } from '@config/index';
import { BlogAsset, BlogPost } from '../entities';
import { blogAssetPublicUrl } from './blog-asset-url';
import { BLOG_ASSET_STORAGE } from './blog-asset-storage';
import type { BlogAssetStorage } from './blog-asset-storage';

const CACHE_CONTROL = 'public, max-age=31536000, immutable';
const FORMAT_TO_MIME = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
} as const;
const FORMAT_TO_EXTENSION = {
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
  avif: 'avif',
} as const;

export interface BlogAssetResponse {
  id: string;
  url: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  altText: string;
  markdown: string;
  createdAt: string;
}

export interface ReadBlogAssetResult {
  stream: Readable;
  mimeType: string;
  sizeBytes: number;
  cacheControl: string;
}

@Injectable()
export class BlogAssetsService {
  private readonly logger = new Logger(BlogAssetsService.name);

  constructor(
    @InjectRepository(BlogAsset)
    private readonly assets: Repository<BlogAsset>,
    @InjectRepository(BlogPost)
    private readonly posts: Repository<BlogPost>,
    @Inject(BLOG_ASSET_STORAGE)
    private readonly storage: BlogAssetStorage,
  ) {}

  async upload(
    file: Express.Multer.File | undefined,
    altText: string,
  ): Promise<BlogAssetResponse> {
    if (!file) throw new BadRequestException('An image file is required');
    if (file.size > envs.blogAssetMaxBytes) {
      throw new BadRequestException('Image exceeds the configured size limit');
    }

    const metadata = await this.inspect(file.buffer);
    const mimeType = FORMAT_TO_MIME[metadata.format];
    if (file.mimetype !== mimeType) {
      throw new BadRequestException('Declared MIME type does not match image');
    }

    const now = new Date();
    const storageKey = [
      'blog',
      String(now.getUTCFullYear()),
      String(now.getUTCMonth() + 1).padStart(2, '0'),
      `${randomUUID()}.${FORMAT_TO_EXTENSION[metadata.format]}`,
    ].join('/');
    const sha256 = createHash('sha256').update(file.buffer).digest('hex');

    await this.storage.put({
      key: storageKey,
      body: file.buffer,
      contentType: mimeType,
      checksumSha256: sha256,
    });

    try {
      const saved = await this.assets.save(
        this.assets.create({
          storageKey,
          originalName: this.safeOriginalName(file.originalname),
          mimeType,
          sizeBytes: file.size,
          width: metadata.width,
          height: metadata.height,
          sha256,
          altText,
        }),
      );
      return this.toResponse(saved);
    } catch (error) {
      await this.storage.delete(storageKey).catch((cleanupError) => {
        this.logger.error(
          `Failed to remove orphan asset ${storageKey}`,
          cleanupError instanceof Error ? cleanupError.stack : undefined,
        );
      });
      throw error;
    }
  }

  async read(id: string): Promise<ReadBlogAssetResult> {
    const asset = await this.findEntity(id);

    return {
      stream: await this.storage.read(asset.storageKey),
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      cacheControl: CACHE_CONTROL,
    };
  }

  async requireExists(id: string): Promise<void> {
    await this.findEntity(id);
  }

  async findAll(): Promise<BlogAssetResponse[]> {
    const assets = await this.assets.find({ order: { createdAt: 'DESC' } });
    return assets.map((asset) => this.toResponse(asset));
  }

  async delete(id: string): Promise<{ deleted: true }> {
    const asset = await this.findEntity(id);
    const references = await this.posts.count({
      where: [{ coverAssetId: id }, { contentMarkdown: Like(`%${id}%`) }],
    });
    if (references > 0) {
      throw new ConflictException('Blog asset is referenced by a post');
    }

    const storageKey = asset.storageKey;
    await this.assets.remove(asset);
    await this.storage.delete(storageKey).catch((error) => {
      this.logger.error(
        `Failed to remove unreferenced asset bytes ${storageKey}`,
        error instanceof Error ? error.stack : undefined,
      );
    });
    return { deleted: true };
  }

  private async inspect(buffer: Buffer): Promise<{
    format: keyof typeof FORMAT_TO_MIME;
    width: number;
    height: number;
  }> {
    try {
      const sharpOptions = {
        failOn: 'warning' as const,
        limitInputPixels: 40_000_000,
      };
      const metadata = await sharp(buffer, sharpOptions).metadata();
      const format = metadata.format as keyof typeof FORMAT_TO_MIME;
      const width = metadata.width ?? 0;
      const height = metadata.height ?? 0;

      if (!(format in FORMAT_TO_MIME)) {
        throw new BadRequestException('Unsupported image format');
      }
      if (width < 1 || height < 1 || width > 8192 || height > 8192) {
        throw new BadRequestException('Image dimensions are not allowed');
      }
      await sharp(buffer, sharpOptions).stats();
      return { format, width, height };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Invalid or corrupted image');
    }
  }

  private safeOriginalName(value: string): string {
    return basename(value)
      .normalize('NFC')
      .replace(/\p{C}/gu, '')
      .slice(0, 120);
  }

  private async findEntity(id: string): Promise<BlogAsset> {
    const asset = await this.assets.findOne({ where: { id } });
    if (!asset) throw new NotFoundException('Blog asset not found');
    return asset;
  }

  private toResponse(asset: BlogAsset): BlogAssetResponse {
    const url = blogAssetPublicUrl(asset.id);
    const safeAlt = asset.altText.replace(/]/g, '\\]');
    return {
      id: asset.id,
      url,
      originalName: asset.originalName,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      width: asset.width,
      height: asset.height,
      altText: asset.altText,
      markdown: `![${safeAlt}](${url})`,
      createdAt: asset.createdAt.toISOString(),
    };
  }
}
