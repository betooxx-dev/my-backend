import { BadRequestException, ConflictException } from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';

import { ApiKeysService } from './api-keys.service';
import { ApiKey } from './entities/api-key.entity';

describe('ApiKeysService', () => {
  const repository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn((value: Partial<ApiKey>) => value),
  };
  const service = new ApiKeysService(
    repository as unknown as Repository<ApiKey>,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    repository.findOne.mockResolvedValue(null);
    repository.save.mockImplementation((value: unknown) =>
      Promise.resolve(value as ApiKey),
    );
    repository.create.mockImplementation((value: Partial<ApiKey>) => value);
  });

  it('validates before generating or persisting a token', async () => {
    await expect(
      service.create({ name: 'valid-name', scopes: ['blog:unknown'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.findOne).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('translates a database unique race into a conflict without exposing a token', async () => {
    repository.save.mockRejectedValue(
      new QueryFailedError('', [], { code: '23505' }),
    );

    await expect(
      service.create({ name: 'racing-name' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it('keeps the early conflict message for an already active name', async () => {
    repository.findOne.mockResolvedValue({ name: 'existing-name' });

    await expect(
      service.create({ name: 'existing-name' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
