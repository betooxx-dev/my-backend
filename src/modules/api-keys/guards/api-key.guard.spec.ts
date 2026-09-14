import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Repository } from 'typeorm';

import { ApiKeyGuard } from './api-key.guard';
import { ApiKey } from '../entities/api-key.entity';

function contextFor(
  authorization: string | string[] | undefined,
): ExecutionContext {
  const request = { headers: { authorization } };
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('ApiKeyGuard', () => {
  const repository = {
    findOne: jest.fn(),
    update: jest.fn(),
  };
  const reflector = new Reflector();
  const guard = new ApiKeyGuard(
    repository as unknown as Repository<ApiKey>,
    reflector,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    repository.update.mockResolvedValue(undefined);
  });

  it.each([
    undefined,
    'Basic token',
    'Bearer',
    'Bearer ',
    'Bearer token extra',
    'Bearer  token',
    'Bearer token ',
    ['Bearer token'],
  ])('rejects invalid authorization header %p with 401', async (header) => {
    await expect(guard.canActivate(contextFor(header))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(repository.findOne).not.toHaveBeenCalled();
  });

  it('resolves an API key for an exact Bearer header', async () => {
    const apiKey = {
      id: 'key-id',
      hash: 'hash',
      active: true,
      revokedAt: null,
      expiresAt: null,
      scopes: [],
    } as ApiKey;
    repository.findOne.mockResolvedValue(apiKey);

    await expect(
      guard.canActivate(contextFor('Bearer mybackend_secret')),
    ).resolves.toBe(true);
    expect(repository.findOne).toHaveBeenCalledTimes(1);
  });
});
