import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({ enum: BlogLocale, example: BlogLocale.EN })
  @IsEnum(BlogLocale)
  locale: BlogLocale;

  @ApiProperty({ example: 'shipping-a-personal-studio' })
  @IsString()
  @Transform(trim)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(120)
  slug: string;

  @ApiProperty({ example: 'Shipping a personal studio' })
  @IsString()
  @Transform(trim)
  @MinLength(1)
  @MaxLength(180)
  title: string;

  @ApiProperty({ example: 'How the publishing system works.' })
  @IsString()
  @Transform(trim)
  @MaxLength(500)
  excerpt: string;

  @ApiPropertyOptional({ example: '# Shipping a personal studio' })
  @IsOptional()
  @IsString()
  @MaxLength(200_000)
  contentMarkdown?: string;

  @ApiPropertyOptional({ example: 'Engineering' })
  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(80)
  category?: string;

  @ApiPropertyOptional({ type: [String], example: ['nestjs', 'studio'] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4')
  coverAssetId?: string | null;
}
