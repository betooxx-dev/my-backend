import type { Repository, SelectQueryBuilder } from 'typeorm';

/* Jest mocks are intentionally inspected as standalone matcher arguments. */
/* eslint-disable @typescript-eslint/unbound-method */

import { BlogLocale, BlogPostStatus } from './dto';
import { BlogPost } from './entities';
import { BlogsService } from './blogs.service';

describe('BlogsService query plans', () => {
  let posts: jest.Mocked<
    Pick<Repository<BlogPost>, 'query' | 'findOne' | 'createQueryBuilder'>
  >;
  let service: BlogsService;

  beforeEach(() => {
    posts = {
      query: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    service = new BlogsService(posts as unknown as Repository<BlogPost>);
  });

  it('uses PostgreSQL DISTINCT and unnest for public tags', async () => {
    posts.query.mockResolvedValue([{ tag: 'nestjs' }, { tag: 'studio' }]);

    await expect(service.getAllTags(BlogLocale.EN)).resolves.toEqual([
      'nestjs',
      'studio',
    ]);

    expect(posts.query).toHaveBeenCalledWith(
      expect.stringMatching(/SELECT DISTINCT[\s\S]*unnest[\s\S]*ORDER BY/),
      [BlogLocale.EN, BlogPostStatus.PUBLISHED],
    );
  });

  it('calculates and limits related posts in PostgreSQL with deterministic ordering', async () => {
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<SelectQueryBuilder<BlogPost>>;
    posts.findOne.mockResolvedValue({
      id: 'source-id',
      locale: BlogLocale.EN,
      slug: 'source',
      status: BlogPostStatus.PUBLISHED,
      tags: ['nestjs', 'studio'],
    } as BlogPost);
    posts.createQueryBuilder.mockReturnValue(queryBuilder);

    await expect(
      service.getRelatedPosts(BlogLocale.EN, 'source'),
    ).resolves.toEqual([]);

    expect(queryBuilder.addSelect).toHaveBeenCalledWith(
      expect.stringMatching(
        /cardinality[\s\S]*unnest[\s\S]*ANY\(:sourceTags\)/,
      ),
      'sharedTags',
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      expect.stringMatching(/cardinality[\s\S]*> 0/),
      { sourceTags: ['nestjs', 'studio'] },
    );
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('"sharedTags"', 'DESC');
    expect(queryBuilder.addOrderBy).toHaveBeenNthCalledWith(
      1,
      'candidate.publishedAt',
      'DESC',
    );
    expect(queryBuilder.addOrderBy).toHaveBeenNthCalledWith(
      2,
      'candidate.id',
      'ASC',
    );
    expect(queryBuilder.limit).toHaveBeenCalledWith(3);
  });
});
