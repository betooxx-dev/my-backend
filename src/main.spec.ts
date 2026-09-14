const mockLoggerLog = jest.fn();
const mockCreate = jest.fn();
const mockConfigureApplication = jest.fn();
const mockApp = {
  listen: jest.fn(),
};
const mockEnvs = {
  stage: 'dev' as 'dev' | 'test' | 'prod',
  port: 5000,
  clientUrl: 'http://localhost:3000',
};

jest.mock('@nestjs/common', () => ({
  Logger: jest.fn().mockImplementation(() => ({ log: mockLoggerLog })),
}));
jest.mock('@nestjs/core', () => ({
  NestFactory: { create: mockCreate },
}));
jest.mock('@/app.module', () => ({ AppModule: {} }));
jest.mock('@/configure-application', () => ({
  configureApplication: mockConfigureApplication,
}));
jest.mock('@config/index', () => ({ envs: mockEnvs }));

import { bootstrap } from './main';

describe('main bootstrap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockResolvedValue(mockApp);
    mockApp.listen.mockResolvedValue(undefined);
    mockEnvs.stage = 'dev';
  });

  it('enables Swagger and logs its URL outside production', async () => {
    await bootstrap();

    expect(mockConfigureApplication).toHaveBeenCalledWith(mockApp, {
      clientUrl: mockEnvs.clientUrl,
      enableSwagger: true,
    });
    expect(mockLoggerLog).toHaveBeenNthCalledWith(
      1,
      'API is running on port: 5000',
    );
    expect(mockLoggerLog).toHaveBeenNthCalledWith(
      2,
      'Swagger docs available at: http://localhost:5000/docs',
    );
  });

  it('disables Swagger and omits its URL from production logs', async () => {
    mockEnvs.stage = 'prod';

    await bootstrap();

    expect(mockConfigureApplication).toHaveBeenCalledWith(mockApp, {
      clientUrl: mockEnvs.clientUrl,
      enableSwagger: false,
    });
    expect(mockLoggerLog).toHaveBeenCalledTimes(1);
    expect(mockLoggerLog).toHaveBeenCalledWith('API is running on port: 5000');
  });
});
