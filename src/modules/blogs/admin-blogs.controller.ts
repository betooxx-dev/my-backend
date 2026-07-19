import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { RequireScopes } from '@/modules/api-keys/decorators/require-scopes.decorator';
import { AdminBlogsService } from './admin-blogs.service';
import {
  AdminBlogPostQueryDto,
  BlogLocaleQueryDto,
  CreateAdminBlogPostDto,
  UpdateAdminBlogPostDto,
} from './dto';

@RequireScopes('blog:admin')
@Controller('blog/admin')
export class AdminBlogsController {
  constructor(private readonly blogs: AdminBlogsService) {}

  @Post('posts')
  create(@Body() dto: CreateAdminBlogPostDto) {
    return this.blogs.create(dto);
  }

  @Get('posts')
  findAll(@Query() query: AdminBlogPostQueryDto) {
    return this.blogs.findAll(query);
  }

  @Get('tags')
  getTags(@Query() query: BlogLocaleQueryDto) {
    return this.blogs.getTags(query.locale);
  }

  @Get('posts/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.blogs.findOne(id);
  }

  @Patch('posts/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminBlogPostDto,
  ) {
    return this.blogs.update(id, dto);
  }

  @Post('posts/:id/publish')
  publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.blogs.publish(id);
  }

  @Post('posts/:id/unpublish')
  unpublish(@Param('id', ParseUUIDPipe) id: string) {
    return this.blogs.unpublish(id);
  }

  @Delete('posts/:id')
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.blogs.delete(id);
  }
}
