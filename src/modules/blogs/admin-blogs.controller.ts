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
import { ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

import {
  ApiAdminDocumentation,
  ApiStringArrayResponse,
  ApiSuccessResponse,
} from '@/common/swagger/api-response';
import { RequireScopes } from '@/modules/api-keys/decorators/require-scopes.decorator';
import { AdminBlogsService } from './admin-blogs.service';
import {
  AdminBlogPostQueryDto,
  BlogLocaleQueryDto,
  CreateAdminBlogPostDto,
  AdminBlogPostResponseDto,
  BlogLocale,
  BlogPostStatus,
  DeletedResponseDto,
  UpdateAdminBlogPostDto,
} from './dto';

@ApiTags('blog-admin')
@ApiAdminDocumentation()
@RequireScopes('blog:admin')
@Controller('blog/admin')
export class AdminBlogsController {
  constructor(private readonly blogs: AdminBlogsService) {}

  @Post('posts')
  @ApiSuccessResponse(AdminBlogPostResponseDto, { status: 201 })
  create(@Body() dto: CreateAdminBlogPostDto) {
    return this.blogs.create(dto);
  }

  @Get('posts')
  @ApiQuery({ name: 'locale', enum: BlogLocale, required: false })
  @ApiQuery({ name: 'status', enum: BlogPostStatus, required: false })
  @ApiSuccessResponse(AdminBlogPostResponseDto, { isArray: true })
  findAll(@Query() query: AdminBlogPostQueryDto) {
    return this.blogs.findAll(query);
  }

  @Get('tags')
  @ApiQuery({ name: 'locale', enum: BlogLocale, required: true })
  @ApiStringArrayResponse()
  getTags(@Query() query: BlogLocaleQueryDto) {
    return this.blogs.getTags(query.locale);
  }

  @Get('posts/:id')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiSuccessResponse(AdminBlogPostResponseDto)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.blogs.findOne(id);
  }

  @Patch('posts/:id')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiSuccessResponse(AdminBlogPostResponseDto)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminBlogPostDto,
  ) {
    return this.blogs.update(id, dto);
  }

  @Post('posts/:id/publish')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiSuccessResponse(AdminBlogPostResponseDto, { status: 201 })
  publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.blogs.publish(id);
  }

  @Post('posts/:id/unpublish')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiSuccessResponse(AdminBlogPostResponseDto, { status: 201 })
  unpublish(@Param('id', ParseUUIDPipe) id: string) {
    return this.blogs.unpublish(id);
  }

  @Delete('posts/:id')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiSuccessResponse(DeletedResponseDto)
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.blogs.delete(id);
  }
}
