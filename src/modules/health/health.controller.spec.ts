import { ServiceUnavailableException } from '@nestjs/common';
import type {
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

import { HealthController } from './health.controller';

describe('HealthController', () => {
  const check = jest.fn();
  const pingCheck = jest.fn();
  const health = { check } as unknown as HealthCheckService;
  const database = { pingCheck } as unknown as TypeOrmHealthIndicator;
  const controller = new HealthController(health, database);

  beforeEach(() => jest.resetAllMocks());

  it('returns a dependency-free liveness response', () => {
    expect(controller.live()).toEqual({ status: 'ok' });
    expect(check).not.toHaveBeenCalled();
    expect(pingCheck).not.toHaveBeenCalled();
  });

  it('returns a minimal readiness response after the database check succeeds', async () => {
    check.mockResolvedValue({
      status: 'ok',
      details: { database: { status: 'up', internal: 'discarded' } },
    });

    await expect(controller.ready()).resolves.toEqual({ status: 'ok' });
    expect(check).toHaveBeenCalledTimes(1);
    const [indicators] = check.mock.calls[0] as [Array<() => Promise<unknown>>];
    pingCheck.mockResolvedValue({ database: { status: 'up' } });
    await expect(indicators[0]()).resolves.toEqual({
      database: { status: 'up' },
    });
    expect(pingCheck).toHaveBeenCalledWith('database');
  });

  it('turns a database health failure into a safe 503 response', async () => {
    check.mockRejectedValue(
      new Error('connect ECONNREFUSED postgres:5432 secret-password'),
    );

    const error = await controller.ready().catch((value: unknown) => value);
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect((error as ServiceUnavailableException).getResponse()).toEqual({
      statusCode: 503,
      message: 'Readiness check failed',
    });
    expect(JSON.stringify(error)).not.toContain('secret-password');
  });
});
