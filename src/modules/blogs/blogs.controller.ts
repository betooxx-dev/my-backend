import { Controller, Get, Param, Query } from '@nestjs/common';

import { Public } from '@/modules/api-keys/decorators/public.decorator';
import { BlogsService } from './blogs.service';
import { BlogLocaleQueryDto, BlogPostParamsDto } from './dto';

@Controller('blog')
export class BlogsController {
  constructor(private readonly blogs: BlogsService) {}

  @Public()
  @Get('posts')
  findPublishedPosts(@Query() query: BlogLocaleQueryDto) {
    return this.blogs.findPublishedByLocale(query.locale);
  }

  @Public()
  @Get('tags')
  getTags(@Query() query: BlogLocaleQueryDto) {
    return this.blogs.getAllTags(query.locale);
  }

  @Public()
  @Get('posts/:locale/:slug')
  getPostBySlug(@Param() params: BlogPostParamsDto) {
    return this.blogs.findPublishedBySlug(params.locale, params.slug);
  }

  @Public()
  @Get('posts/:locale/:slug/related')
  getRelatedPosts(@Param() params: BlogPostParamsDto) {
    return this.blogs.getRelatedPosts(params.locale, params.slug);
  }
}
