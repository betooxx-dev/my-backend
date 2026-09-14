import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';

import { BlogLocale, BlogPostStatus } from './dto';
import { BlogPost } from './entities';
import { blogAssetPublicUrl } from './assets/blog-asset-url';
import { readingTimeMinutes } from './blog-content';

export interface BlogPostResponse {
  id: string;
  slug: string;
  locale: BlogLocale;
  title: string;
  excerpt: string;
  contentMarkdown: string;
  date: string;
  publishedAt: string;
  readingTimeMinutes: number;
  category: string;
  tags: string[];
  cover: string;
  coverAlt: string;
  coverAssetId: string;
  featured: boolean;
  status: BlogPostStatus.PUBLISHED;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class BlogsService {
  constructor(
    @InjectRepository(BlogPost)
    private readonly posts: Repository<BlogPost>,
  ) {}

  async findPublishedByLocale(locale: BlogLocale): Promise<BlogPostResponse[]> {
    const posts = await this.posts.find({
      where: { locale, status: BlogPostStatus.PUBLISHED },
      order: { publishedAt: 'DESC' },
      relations: { coverAsset: true },
    });
    return posts.map((post) => this.toResponse(post));
  }

  async findPublishedBySlug(
    locale: BlogLocale,
    slug: string,
  ): Promise<BlogPostResponse> {
    return this.toResponse(await this.findPublishedEntity(locale, slug));
  }

  async getAllTags(locale: BlogLocale): Promise<string[]> {
    const posts = await this.findPublishedByLocale(locale);
    return Array.from(new Set(posts.flatMap((post) => post.tags))).sort();
  }

  async getAllCategories(locale: BlogLocale): Promise<string[]> {
    const rows = await this.posts
      .createQueryBuilder('post')
      .innerJoin('post.categoryEntity', 'category')
      .select('category.name', 'name')
      .addSelect('category.position', 'position')
      .where('post.locale = :locale AND post.status = :status', {
        locale,
        status: BlogPostStatus.PUBLISHED,
      })
      .distinct(true)
      .orderBy('category.position', 'ASC')
      .addOrderBy('category.name', 'ASC')
      .getRawMany<{ name: string; position: number }>();
    return rows.map((row) => row.name);
  }

  async getRelatedPosts(
    locale: BlogLocale,
    slug: string,
  ): Promise<BlogPostResponse[]> {
    const post = await this.findPublishedEntity(locale, slug);
    const candidates = await this.posts.find({
      where: {
        id: Not(post.id),
        locale,
        status: BlogPostStatus.PUBLISHED,
      },
      order: { publishedAt: 'DESC' },
      relations: { coverAsset: true },
    });
    const tags = new Set(post.tags);

    return candidates
      .map((candidate) => ({
        candidate,
        sharedTags: candidate.tags.filter((tag) => tags.has(tag)).length,
      }))
      .filter(({ sharedTags }) => sharedTags > 0)
      .sort((left, right) => right.sharedTags - left.sharedTags)
      .slice(0, 3)
      .map(({ candidate }) => this.toResponse(candidate));
  }

  private async findPublishedEntity(
    locale: BlogLocale,
    slug: string,
  ): Promise<BlogPost> {
    const post = await this.posts.findOne({
      where: { locale, slug, status: BlogPostStatus.PUBLISHED },
      relations: { coverAsset: true },
    });
    if (!post) throw new NotFoundException('Blog post not found');
    return post;
  }

  private toResponse(post: BlogPost): BlogPostResponse {
    if (!post.publishedAt || !post.coverAssetId) {
      throw new Error('Published blog post is missing publication data');
    }

    return {
      id: post.id,
      slug: post.slug,
      locale: post.locale,
      title: post.title,
      excerpt: post.excerpt,
      contentMarkdown: post.contentMarkdown,
      date: post.publishedAt.toISOString().slice(0, 10),
      publishedAt: post.publishedAt.toISOString(),
      readingTimeMinutes: readingTimeMinutes(post.contentMarkdown),
      category: post.category,
      tags: post.tags,
      cover: blogAssetPublicUrl(post.coverAssetId),
      coverAssetId: post.coverAssetId,
      coverAlt: post.coverAsset?.altText ?? '',
      featured: post.featured,
      status: BlogPostStatus.PUBLISHED,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  }
}
