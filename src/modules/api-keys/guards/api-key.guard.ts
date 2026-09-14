import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { Repository } from 'typeorm';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ApiKey } from '../entities/api-key.entity';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import { parseBearerToken } from '../api-key-input';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeys: Repository<ApiKey>,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('Missing API key');

    const hash = createHash('sha256').update(token).digest('hex');
    const apiKey = await this.apiKeys.findOne({ where: { hash } });

    if (!apiKey) throw new UnauthorizedException('Invalid API key');
    if (!apiKey.active || apiKey.revokedAt)
      throw new UnauthorizedException('API key revoked');
    if (apiKey.expiresAt && apiKey.expiresAt.getTime() <= Date.now())
      throw new UnauthorizedException('API key expired');

    this.apiKeys
      .update(apiKey.id, { lastUsedAt: new Date() })
      .catch((err) =>
        this.logger.warn(
          `Failed to update lastUsedAt for ${apiKey.id}: ${err}`,
        ),
      );

    request.apiKey = apiKey;
    return true;
  }

  private extractToken(request: AuthenticatedRequest): string | undefined {
    const header = request.headers['authorization'];
    return parseBearerToken(header);
  }
}
