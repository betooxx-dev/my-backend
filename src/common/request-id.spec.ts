import { isValidRequestId, resolveRequestId } from './request-id';

const validRequestId = '550e8400-e29b-41d4-a716-446655440000';

describe('request ID validation', () => {
  it('accepts canonical UUIDs and preserves the exact value', () => {
    expect(isValidRequestId(validRequestId)).toBe(true);
    expect(resolveRequestId(validRequestId)).toBe(validRequestId);
  });

  it.each([
    undefined,
    '',
    'not-a-uuid',
    '550e8400-e29b-41d4-a716-446655440000\nX-Injected: yes',
  ])('replaces invalid header %p with a generated UUID', (header) => {
    expect(isValidRequestId(header)).toBe(false);
    expect(resolveRequestId(header)).toEqual(
      expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      ),
    );
  });

  it('rejects duplicate header values instead of choosing one', () => {
    expect(isValidRequestId([validRequestId, validRequestId])).toBe(false);
    expect(resolveRequestId([validRequestId, validRequestId])).not.toBe(
      validRequestId,
    );
  });
});
