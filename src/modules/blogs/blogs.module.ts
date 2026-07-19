import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BlogsController } from './blogs.controller';
import { BlogsService } from './blogs.service';
import { AdminBlogsController } from './admin-blogs.controller';
import { AdminBlogsService } from './admin-blogs.service';
import { BlogAssetsModule } from './assets/blog-assets.module';
import { BlogPost } from './entities';

@Module({
  imports: [BlogAssetsModule, TypeOrmModule.forFeature([BlogPost])],
  controllers: [BlogsController, AdminBlogsController],
  providers: [BlogsService, AdminBlogsService],
  exports: [BlogsService],
})
export class BlogsModule {}
