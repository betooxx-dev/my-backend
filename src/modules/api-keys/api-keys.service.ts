import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'node:crypto';
import { IsNull, Not, QueryFailedError, Repository } from 'typeorm';

import { envs } from '@config/index';
import {
  ApiKeyInputError,
  validateApiKeyCreateInput,
  type ValidatedApiKeyCreateInput,
} from './api-key-input';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { ApiKey } from './entities/api-key.entity';

export interface CreatedApiKey {
  token: string;
  record: ApiKey;
}

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeys: Repository<ApiKey>,
  ) {}

  async create(dto: CreateApiKeyDto): Promise<CreatedApiKey> {
    let input: ValidatedApiKeyCreateInput;
    try {
      input = validateApiKeyCreateInput(dto);
    } catch (error) {
      if (error instanceof ApiKeyInputError)
        throw new BadRequestException(error.message);
      throw error;
    }

    const existing = await this.apiKeys.findOne({
      where: { name: input.name, revokedAt: IsNull() },
    });
    if (existing)
      throw new ConflictException(
        `An active API key with name "${input.name}" already exists`,
      );

    const token = this.generateToken();
    const hash = createHash('sha256').update(token).digest('hex');
    const displayPrefix = token.slice(0, 16);

    const expiresAt =
      typeof input.expiresInDays === 'number'
        ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
        : null;

    let record: ApiKey;
    try {
      record = await this.apiKeys.save(
        this.apiKeys.create({
          name: input.name,
          hash,
          displayPrefix,
          scopes: input.scopes,
          active: true,
          expiresAt,
          lastUsedAt: null,
          revokedAt: null,
        }),
      );
    } catch (error) {
      if (isPostgresUniqueViolation(error))
        throw new ConflictException(
          `An active API key with name "${input.name}" already exists`,
        );
      throw error;
    }

    return { token, record };
  }

  list(): Promise<ApiKey[]> {
    return this.apiKeys.find({ order: { createdAt: 'DESC' } });
  }

  listActive(): Promise<ApiKey[]> {
    return this.apiKeys.find({
      where: { active: true, revokedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  async revoke(id: string): Promise<ApiKey> {
    const apiKey = await this.apiKeys.findOne({ where: { id } });
    if (!apiKey) throw new NotFoundException(`API key ${id} not found`);
    if (apiKey.revokedAt) return apiKey;

    apiKey.active = false;
    apiKey.revokedAt = new Date();
    return this.apiKeys.save(apiKey);
  }

  async revokeByName(name: string): Promise<ApiKey[]> {
    const keys = await this.apiKeys.find({
      where: { name, revokedAt: IsNull() },
    });
    if (keys.length === 0)
      throw new NotFoundException(
        `No active API keys found with name "${name}"`,
      );

    const now = new Date();
    for (const key of keys) {
      key.active = false;
      key.revokedAt = now;
    }
    return this.apiKeys.save(keys);
  }

  async findRevoked(): Promise<ApiKey[]> {
    return this.apiKeys.find({
      where: { revokedAt: Not(IsNull()) },
      order: { revokedAt: 'DESC' },
    });
  }

  private generateToken(): string {
    const prefix = envs.apiKeyPrefix;
    const secret = randomBytes(32).toString('hex');
    return `${prefix}${secret}`;
  }
}

function isPostgresUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string }).code === '23505'
  );
}
