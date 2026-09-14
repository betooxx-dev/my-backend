import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';

import { Public } from '@/modules/api-keys/decorators/public.decorator';

@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: TypeOrmHealthIndicator,
  ) {}

  @Get('live')
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  @HealthCheck({ swaggerDocumentation: false })
  async ready(): Promise<{ status: 'ok' }> {
    try {
      await this.health.check([() => this.database.pingCheck('database')]);
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException({
        statusCode: 503,
        message: 'Readiness check failed',
      });
    }
  }
}
