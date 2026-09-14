import { IsEnum, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum BlogLocale {
  ES = 'es',
  EN = 'en',
}

export enum BlogPostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

export class BlogLocaleQueryDto {
  @ApiProperty({ enum: BlogLocale, example: BlogLocale.EN })
  @IsEnum(BlogLocale)
  locale: BlogLocale;
}

export class BlogPostParamsDto {
  @ApiProperty({ enum: BlogLocale, example: BlogLocale.EN })
  @IsEnum(BlogLocale)
  locale: BlogLocale;

  @ApiProperty({ example: 'shipping-a-personal-studio' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug: string;
}
