import { BlogCategoriesService } from './categories/blog-categories.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';

import {
  BlogPostStatus,
  BlogLocale,
  AdminBlogPostQueryDto,
  CreateAdminBlogPostDto,
  UpdateAdminBlogPostDto,
} from './dto';
import { BlogPost } from './entities';
import { blogAssetPublicUrl } from './assets/blog-asset-url';
import { BlogAssetsService } from './assets/blog-assets.service';
import { readingTimeMinutes } from './blog-content';

export interface AdminBlogPostResponse {
  id: string;
  locale: string;
  slug: string;
  title: string;
  excerpt: string;
  contentMarkdown: string;
  category: string;
  tags: string[];
  featured: boolean;
  coverAlt: string;
  coverAssetId: string | null;
  cover: string | null;
  status: BlogPostStatus;
  publishedAt: string | null;
  readingTimeMinutes: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class AdminBlogsService {
  constructor(
    @InjectRepository(BlogPost)
    private readonly posts: Repository<BlogPost>,
    private readonly assets: BlogAssetsService,
    private readonly categories: BlogCategoriesService,
  ) {}

  async create(dto: CreateAdminBlogPostDto): Promise<AdminBlogPostResponse> {
    if (dto.coverAssetId) await this.assets.requireExists(dto.coverAssetId);
    const duplicate = await this.posts.findOne({
      where: { locale: dto.locale, slug: dto.slug },
    });
    if (duplicate) {
      throw new ConflictException('A post with this locale and slug exists');
    }

    const post = this.posts.create({
      locale: dto.locale,
      slug: dto.slug,
      title: dto.title,
      excerpt: dto.excerpt,
      contentMarkdown: dto.contentMarkdown ?? '',
      publishedAt: null,
      category: await this.categories.resolve(dto.category ?? 'General'),
      tags: dto.tags ?? [],
      coverAssetId: dto.coverAssetId ?? null,
      featured: dto.featured ?? false,
      status: BlogPostStatus.DRAFT,
    });

    const saved = await this.assets.withReferences(
      post.coverAssetId,
      post.contentMarkdown,
      (manager) =>
        manager
          .getRepository(BlogPost)
          .save({ ...post, coverAsset: undefined }),
    );
    return this.findOne(saved.id);
  }

  async findOne(id: string): Promise<AdminBlogPostResponse> {
    const post = await this.findEntity(id);
    return this.toResponse(post);
  }

  async findAll(
    query: AdminBlogPostQueryDto,
  ): Promise<AdminBlogPostResponse[]> {
    const where: FindOptionsWhere<BlogPost> = {};
    if (query.locale) where.locale = query.locale;
    if (query.status) where.status = query.status;
    const posts = await this.posts.find({
      where,
      order: { updatedAt: 'DESC', id: 'ASC' },
      relations: { coverAsset: true },
    });
    return posts.map((post) => this.toResponse(post));
  }

  async getTags(locale: BlogLocale): Promise<string[]> {
    const rows = await this.posts.query<{ tag: string }[]>(
      `SELECT DISTINCT tag.value AS "tag"
       FROM "blog_posts" AS post
       CROSS JOIN LATERAL unnest(post."tags") AS tag(value)
       WHERE post."locale" = $1
       ORDER BY "tag" ASC`,
      [locale],
    );
    return rows.map((row) => row.tag);
  }

  async update(
    id: string,
    dto: UpdateAdminBlogPostDto,
  ): Promise<AdminBlogPostResponse> {
    const post = await this.findEntity(id);
    if (dto.coverAssetId) {
      await this.assets.requireExists(dto.coverAssetId);
    }
    const locale = dto.locale ?? post.locale;
    const slug = dto.slug ?? post.slug;

    if (locale !== post.locale || slug !== post.slug) {
      const duplicate = await this.posts.findOne({ where: { locale, slug } });
      if (duplicate && duplicate.id !== post.id) {
        throw new ConflictException('A post with this locale and slug exists');
      }
    }

    Object.assign(post, {
      ...(dto.locale === undefined ? {} : { locale: dto.locale }),
      ...(dto.slug === undefined ? {} : { slug: dto.slug }),
      ...(dto.title === undefined ? {} : { title: dto.title }),
      ...(dto.excerpt === undefined ? {} : { excerpt: dto.excerpt }),
      ...(dto.contentMarkdown === undefined
        ? {}
        : { contentMarkdown: dto.contentMarkdown }),
      ...(dto.category === undefined
        ? {}
        : { category: await this.categories.resolve(dto.category) }),
      ...(dto.tags === undefined ? {} : { tags: dto.tags }),
      ...(dto.featured === undefined ? {} : { featured: dto.featured }),
      ...(dto.coverAssetId === undefined
        ? {}
        : { coverAssetId: dto.coverAssetId }),
    });

    if (post.status === BlogPostStatus.PUBLISHED) {
      this.assertPublishable(post);
    }

    const saved = await this.assets.withReferences(
      post.coverAssetId,
      post.contentMarkdown,
      (manager) =>
        manager
          .getRepository(BlogPost)
          .save({ ...post, coverAsset: undefined }),
    );
    return this.findOne(saved.id);
  }

  async publish(id: string): Promise<AdminBlogPostResponse> {
    const post = await this.findEntity(id);
    this.assertPublishable(post);

    await this.assets.requireExists(post.coverAssetId!);
    if (post.status === BlogPostStatus.PUBLISHED && post.publishedAt) {
      return this.toResponse(post);
    }
    post.status = BlogPostStatus.PUBLISHED;
    post.publishedAt ??= new Date();
    const saved = await this.assets.withReferences(
      post.coverAssetId,
      post.contentMarkdown,
      (manager) =>
        manager
          .getRepository(BlogPost)
          .save({ ...post, coverAsset: undefined }),
    );
    return this.findOne(saved.id);
  }

  async unpublish(id: string): Promise<AdminBlogPostResponse> {
    const post = await this.findEntity(id);
    post.status = BlogPostStatus.DRAFT;
    post.publishedAt = null;
    const saved = await this.assets.withReferences(
      post.coverAssetId,
      post.contentMarkdown,
      (manager) =>
        manager
          .getRepository(BlogPost)
          .save({ ...post, coverAsset: undefined }),
    );
    return this.findOne(saved.id);
  }

  async delete(id: string): Promise<{ deleted: true }> {
    const post = await this.findEntity(id);
    await this.posts.remove(post);
    return { deleted: true };
  }

  private async findEntity(id: string): Promise<BlogPost> {
    const post = await this.posts.findOne({
      where: { id },
      relations: { coverAsset: true },
    });
    if (!post) throw new NotFoundException('Blog post not found');
    return post;
  }

  private assertPublishable(post: BlogPost): void {
    if (
      !post.title.trim() ||
      !post.slug.trim() ||
      !post.excerpt.trim() ||
      !post.contentMarkdown.trim() ||
      !post.category.trim() ||
      !post.coverAssetId
    ) {
      throw new ConflictException(
        'A post needs title, slug, excerpt, Markdown, category and cover before publishing',
      );
    }
  }

  private toResponse(post: BlogPost): AdminBlogPostResponse {
    return {
      id: post.id,
      locale: post.locale,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      contentMarkdown: post.contentMarkdown,
      category: post.category,
      tags: post.tags,
      featured: post.featured,
      coverAssetId: post.coverAssetId,
      coverAlt: post.coverAsset?.altText ?? '',
      cover: post.coverAssetId ? blogAssetPublicUrl(post.coverAssetId) : null,
      status: post.status,
      publishedAt: post.publishedAt?.toISOString() ?? null,
      readingTimeMinutes: readingTimeMinutes(post.contentMarkdown),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  }
}
