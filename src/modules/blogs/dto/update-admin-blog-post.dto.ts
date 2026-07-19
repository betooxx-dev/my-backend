import { PartialType } from '@nestjs/swagger';

import { CreateAdminBlogPostDto } from './create-admin-blog-post.dto';

export class UpdateAdminBlogPostDto extends PartialType(
  CreateAdminBlogPostDto,
) {}
