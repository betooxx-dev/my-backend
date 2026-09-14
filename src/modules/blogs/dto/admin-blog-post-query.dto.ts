import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { BlogLocale, BlogPostStatus } from './blog-query.dto';

export class AdminBlogPostQueryDto {
  @ApiPropertyOptional({ enum: BlogLocale })
  @IsOptional()
  @IsEnum(BlogLocale)
  locale?: BlogLocale;

  @ApiPropertyOptional({ enum: BlogPostStatus })
  @IsOptional()
  @IsEnum(BlogPostStatus)
  status?: BlogPostStatus;
}
