import { BlogCategory } from './categories/blog-category.entity';
import { BlogCategoryBootstrap } from './categories/blog-category-bootstrap';
import { BlogCategoriesService } from './categories/blog-categories.service';
import { BlogCategoriesController } from './categories/blog-categories.controller';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BlogsController } from './blogs.controller';
import { BlogsService } from './blogs.service';
import { AdminBlogsController } from './admin-blogs.controller';
import { AdminBlogsService } from './admin-blogs.service';
import { BlogAssetsModule } from './assets/blog-assets.module';
import { BlogPost } from './entities';

@Module({
  imports: [
    BlogAssetsModule,
    TypeOrmModule.forFeature([BlogPost, BlogCategory]),
  ],
  controllers: [
    BlogsController,
    AdminBlogsController,
    BlogCategoriesController,
  ],
  providers: [
    BlogsService,
    AdminBlogsService,
    BlogCategoriesService,
    BlogCategoryBootstrap,
  ],
  exports: [BlogsService],
})
export class BlogsModule {}
