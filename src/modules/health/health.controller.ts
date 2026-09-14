import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';

import {
  ApiReadinessDocumentation,
  ApiSuccessResponse,
} from '@/common/swagger/api-response';
import { Public } from '@/modules/api-keys/decorators/public.decorator';
import { HealthResponseDto } from './health-response.dto';

@Public()
@SkipThrottle()
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: TypeOrmHealthIndicator,
  ) {}

  @Get('live')
  @ApiSuccessResponse(HealthResponseDto)
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiSuccessResponse(HealthResponseDto)
  @ApiReadinessDocumentation()
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
