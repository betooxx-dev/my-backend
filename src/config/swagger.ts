export type SwaggerStage = 'dev' | 'test' | 'prod';

export function isSwaggerEnabled(stage: SwaggerStage): boolean {
  return stage !== 'prod';
}

export function getSwaggerStartupMessage(
  stage: SwaggerStage,
  port: number,
): string | undefined {
  if (!isSwaggerEnabled(stage)) return undefined;

  return `Swagger docs available at: http://localhost:${port}/docs`;
}
