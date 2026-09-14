import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { envs } from '@config/index';
import { BlogCategory } from './blog-category.entity';

@Injectable()
export class BlogCategoryBootstrap implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(BlogCategory)
    private readonly categories: Repository<BlogCategory>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (envs.stage !== 'dev') return;

    try {
      await this.categories.insert({
        name: 'General',
        key: 'general',
        position: 0,
      });
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === '23505'
      ) {
        return;
      }
      throw error;
    }
  }
}
