import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

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
      order: { publishedAt: 'DESC', id: 'ASC' },
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
    const rows = await this.posts.query<{ tag: string }[]>(
      `SELECT DISTINCT tag.value AS "tag"
       FROM "blog_posts" AS post
       CROSS JOIN LATERAL unnest(post."tags") AS tag(value)
       WHERE post."locale" = $1 AND post."status" = $2
       ORDER BY "tag" ASC`,
      [locale, BlogPostStatus.PUBLISHED],
    );
    return rows.map((row) => row.tag);
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
    const sharedTagsExpression = `cardinality(ARRAY(
      SELECT candidate_tag.value
      FROM unnest(candidate.tags) AS candidate_tag(value)
      WHERE candidate_tag.value = ANY(:sourceTags)
    ))`;
    const candidates = await this.posts
      .createQueryBuilder('candidate')
      .leftJoinAndSelect('candidate.coverAsset', 'coverAsset')
      .where('candidate.id != :id', { id: post.id })
      .andWhere('candidate.locale = :locale', { locale })
      .andWhere('candidate.status = :status', {
        status: BlogPostStatus.PUBLISHED,
      })
      .andWhere(`${sharedTagsExpression} > 0`, { sourceTags: post.tags })
      .addSelect(sharedTagsExpression, 'sharedTags')
      .orderBy('"sharedTags"', 'DESC')
      .addOrderBy('candidate.publishedAt', 'DESC')
      .addOrderBy('candidate.id', 'ASC')
      .limit(3)
      .getMany();

    return candidates.map((candidate) => this.toResponse(candidate));
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
