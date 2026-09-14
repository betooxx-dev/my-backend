import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { RequireScopes } from '@/modules/api-keys/decorators/require-scopes.decorator';
import { BlogCategoriesService } from './blog-categories.service';
import { CategoryDto } from './category.dto';

@RequireScopes('blog:admin')
@Controller('blog/admin/categories')
export class BlogCategoriesController {
  constructor(private readonly categories: BlogCategoriesService) {}

  @Get()
  findAll() {
    return this.categories.findAll();
  }

  @Post()
  create(@Body() dto: CategoryDto) {
    return this.categories.create(dto);
  }

  @Patch(':name')
  update(@Param('name') name: string, @Body() dto: CategoryDto) {
    return this.categories.update(name, dto);
  }

  @Delete(':name')
  delete(@Param('name') name: string) {
    return this.categories.delete(name);
  }
}
