import { IsEnum, IsOptional } from 'class-validator';

import { BlogLocale, BlogPostStatus } from './blog-query.dto';

export class AdminBlogPostQueryDto {
  @IsOptional()
  @IsEnum(BlogLocale)
  locale?: BlogLocale;

  @IsOptional()
  @IsEnum(BlogPostStatus)
  status?: BlogPostStatus;
}
