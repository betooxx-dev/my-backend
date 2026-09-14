import { getSwaggerStartupMessage, isSwaggerEnabled } from './swagger';

describe('Swagger runtime policy', () => {
  it.each(['dev', 'test'] as const)('enables documentation in %s', (stage) => {
    expect(isSwaggerEnabled(stage)).toBe(true);
    expect(getSwaggerStartupMessage(stage, 5000)).toBe(
      'Swagger docs available at: http://localhost:5000/docs',
    );
  });

  it('disables documentation and its startup message in prod', () => {
    expect(isSwaggerEnabled('prod')).toBe(false);
    expect(getSwaggerStartupMessage('prod', 5000)).toBeUndefined();
  });
});
