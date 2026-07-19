import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { BlogLocale } from './blog-query.dto';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateAdminBlogPostDto {
  @IsEnum(BlogLocale)
  locale: BlogLocale;

  @IsString()
  @Transform(trim)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(120)
  slug: string;

  @IsString()
  @Transform(trim)
  @MinLength(1)
  @MaxLength(180)
  title: string;

  @IsString()
  @Transform(trim)
  @MaxLength(500)
  excerpt: string;

  @IsOptional()
  @IsString()
  @MaxLength(200_000)
  contentMarkdown?: string;

  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsUUID('4')
  coverAssetId?: string | null;
}
