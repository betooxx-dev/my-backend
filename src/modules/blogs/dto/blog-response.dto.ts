import { ApiProperty } from '@nestjs/swagger';

import { BlogLocale, BlogPostStatus } from './blog-query.dto';

export class BlogPostResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'shipping-a-personal-studio' })
  slug!: string;

  @ApiProperty({ enum: BlogLocale })
  locale!: BlogLocale;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  excerpt!: string;

  @ApiProperty()
  contentMarkdown!: string;

  @ApiProperty({ format: 'date' })
  date!: string;

  @ApiProperty({ format: 'date-time' })
  publishedAt!: string;

  @ApiProperty({ example: 5 })
  readingTimeMinutes!: number;

  @ApiProperty()
  category!: string;

  @ApiProperty({ type: [String] })
  tags!: string[];

  @ApiProperty({ format: 'uri' })
  cover!: string;

  @ApiProperty()
  coverAlt!: string;

  @ApiProperty({ format: 'uuid' })
  coverAssetId!: string;

  @ApiProperty()
  featured!: boolean;

  @ApiProperty({ enum: [BlogPostStatus.PUBLISHED] })
  status!: BlogPostStatus.PUBLISHED;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class AdminBlogPostResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: BlogLocale })
  locale!: BlogLocale;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  excerpt!: string;

  @ApiProperty()
  contentMarkdown!: string;

  @ApiProperty()
  category!: string;

  @ApiProperty({ type: [String] })
  tags!: string[];

  @ApiProperty()
  featured!: boolean;

  @ApiProperty()
  coverAlt!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  coverAssetId!: string | null;

  @ApiProperty({ format: 'uri', nullable: true })
  cover!: string | null;

  @ApiProperty({ enum: BlogPostStatus })
  status!: BlogPostStatus;

  @ApiProperty({ format: 'date-time', nullable: true })
  publishedAt!: string | null;

  @ApiProperty({ example: 5 })
  readingTimeMinutes!: number;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class BlogCategoryResponseDto {
  @ApiProperty()
  name!: string;

  @ApiProperty({ example: 0 })
  position!: number;
}

export class BlogAssetResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uri' })
  url!: string;

  @ApiProperty()
  originalName!: string;

  @ApiProperty({ example: 'image/webp' })
  mimeType!: string;

  @ApiProperty()
  sizeBytes!: number;

  @ApiProperty()
  width!: number;

  @ApiProperty()
  height!: number;

  @ApiProperty()
  altText!: string;

  @ApiProperty()
  markdown!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class DeletedResponseDto {
  @ApiProperty({ example: true })
  deleted!: true;
}
