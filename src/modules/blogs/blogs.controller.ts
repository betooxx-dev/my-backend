import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

import {
  ApiPublicNotFoundDocumentation,
  ApiStringArrayResponse,
  ApiSuccessResponse,
} from '@/common/swagger/api-response';
import { Public } from '@/modules/api-keys/decorators/public.decorator';
import { BlogsService } from './blogs.service';
import {
  BlogLocale,
  BlogLocaleQueryDto,
  BlogPostParamsDto,
  BlogPostResponseDto,
} from './dto';

@ApiTags('blog')
@ApiPublicNotFoundDocumentation()
@Controller('blog')
export class BlogsController {
  constructor(private readonly blogs: BlogsService) {}

  @Public()
  @Get('posts')
  @ApiQuery({ name: 'locale', enum: BlogLocale, required: true })
  @ApiSuccessResponse(BlogPostResponseDto, { isArray: true })
  findPublishedPosts(@Query() query: BlogLocaleQueryDto) {
    return this.blogs.findPublishedByLocale(query.locale);
  }

  @Public()
  @Get('tags')
  @ApiQuery({ name: 'locale', enum: BlogLocale, required: true })
  @ApiStringArrayResponse()
  getTags(@Query() query: BlogLocaleQueryDto) {
    return this.blogs.getAllTags(query.locale);
  }

  @Public()
  @Get('categories')
  @ApiQuery({ name: 'locale', enum: BlogLocale, required: true })
  @ApiStringArrayResponse()
  getCategories(@Query() query: BlogLocaleQueryDto) {
    return this.blogs.getAllCategories(query.locale);
  }

  @Public()
  @Get('posts/:locale/:slug')
  @ApiParam({ name: 'locale', enum: BlogLocale })
  @ApiParam({ name: 'slug', example: 'shipping-a-personal-studio' })
  @ApiSuccessResponse(BlogPostResponseDto)
  getPostBySlug(@Param() params: BlogPostParamsDto) {
    return this.blogs.findPublishedBySlug(params.locale, params.slug);
  }

  @Public()
  @Get('posts/:locale/:slug/related')
  @ApiParam({ name: 'locale', enum: BlogLocale })
  @ApiParam({ name: 'slug', example: 'shipping-a-personal-studio' })
  @ApiSuccessResponse(BlogPostResponseDto, { isArray: true })
  getRelatedPosts(@Param() params: BlogPostParamsDto) {
    return this.blogs.getRelatedPosts(params.locale, params.slug);
  }
}
