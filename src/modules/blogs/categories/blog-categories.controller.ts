import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import {
  ApiAdminDocumentation,
  ApiSuccessResponse,
} from '@/common/swagger/api-response';
import { RequireScopes } from '@/modules/api-keys/decorators/require-scopes.decorator';
import { BlogCategoriesService } from './blog-categories.service';
import { BlogCategoryResponseDto, DeletedResponseDto } from '../dto';
import { CategoryDto } from './category.dto';

@ApiTags('blog-admin-categories')
@ApiAdminDocumentation()
@RequireScopes('blog:admin')
@Controller('blog/admin/categories')
export class BlogCategoriesController {
  constructor(private readonly categories: BlogCategoriesService) {}

  @Get()
  @ApiSuccessResponse(BlogCategoryResponseDto, { isArray: true })
  findAll() {
    return this.categories.findAll();
  }

  @Post()
  @ApiSuccessResponse(BlogCategoryResponseDto, { status: 201 })
  create(@Body() dto: CategoryDto) {
    return this.categories.create(dto);
  }

  @Patch(':name')
  @ApiParam({ name: 'name', example: 'Engineering' })
  @ApiSuccessResponse(BlogCategoryResponseDto)
  update(@Param('name') name: string, @Body() dto: CategoryDto) {
    return this.categories.update(name, dto);
  }

  @Delete(':name')
  @ApiParam({ name: 'name', example: 'Engineering' })
  @ApiSuccessResponse(DeletedResponseDto)
  delete(@Param('name') name: string) {
    return this.categories.delete(name);
  }
}
