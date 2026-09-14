import { parseBearerToken, validateApiKeyCreateInput } from './api-key-input';

describe('API key input contract', () => {
  describe('parseBearerToken', () => {
    it('accepts only a complete Bearer header with one token', () => {
      expect(parseBearerToken('Bearer mybackend_secret')).toBe(
        'mybackend_secret',
      );
    });

    it.each([
      undefined,
      'Basic mybackend_secret',
      'bearer mybackend_secret',
      'Bearer',
      'Bearer ',
      'Bearer mybackend_secret extra',
      'Bearer  mybackend_secret',
      ' Bearer mybackend_secret',
      'Bearer mybackend_secret ',
      ['Bearer mybackend_secret'],
    ])('rejects ambiguous header %p', (header) => {
      expect(parseBearerToken(header)).toBeUndefined();
    });
  });

  describe('validateApiKeyCreateInput', () => {
    it('returns normalized values for valid input', () => {
      expect(
        validateApiKeyCreateInput({
          name: 'studio-admin',
          scopes: ['blog:admin'],
          expiresInDays: 30,
        }),
      ).toEqual({
        name: 'studio-admin',
        scopes: ['blog:admin'],
        expiresInDays: 30,
      });
    });

    it.each([
      { name: 'ab' },
      { name: 'bad/name' },
      { name: 'valid-name', scopes: ['blog:unknown'] },
      { name: 'valid-name', scopes: ['blog:admin', 'blog:admin'] },
      { name: 'valid-name', scopes: [''] },
      { name: 'valid-name', expiresInDays: 0 },
      { name: 'valid-name', expiresInDays: 1.5 },
      { name: 'valid-name', expiresInDays: Number.POSITIVE_INFINITY },
      { name: 'valid-name', expiresInDays: '30' },
    ])('rejects invalid input %p', (input) => {
      expect(() => validateApiKeyCreateInput(input)).toThrow();
    });
  });
});
