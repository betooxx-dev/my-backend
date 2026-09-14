import { QueryFailedError, Repository } from 'typeorm';

const mockEnvs = { stage: 'dev' as 'dev' | 'test' | 'prod' };

jest.mock('@config/index', () => ({ envs: mockEnvs }));

import { BlogCategoryBootstrap } from './blog-category-bootstrap';
import { BlogCategory } from './blog-category.entity';

describe('BlogCategoryBootstrap', () => {
  const repository = {
    insert: jest.fn(),
  };
  const bootstrap = new BlogCategoryBootstrap(
    repository as unknown as Repository<BlogCategory>,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    mockEnvs.stage = 'dev';
  });

  it('inserts the canonical General category during a dev bootstrap', async () => {
    await bootstrap.onApplicationBootstrap();

    expect(repository.insert).toHaveBeenCalledWith({
      name: 'General',
      key: 'general',
      position: 0,
    });
  });

  it('treats the expected unique conflict as an idempotent success', async () => {
    repository.insert.mockRejectedValue(
      new QueryFailedError('', [], { code: '23505' }),
    );

    await expect(bootstrap.onApplicationBootstrap()).resolves.toBeUndefined();
  });

  it('propagates unexpected database errors', async () => {
    const error = new Error('database unavailable');
    repository.insert.mockRejectedValue(error);

    await expect(bootstrap.onApplicationBootstrap()).rejects.toBe(error);
  });

  it('does not write in test or production stages', async () => {
    mockEnvs.stage = 'test';

    await bootstrap.onApplicationBootstrap();

    expect(repository.insert).not.toHaveBeenCalled();
  });
});
