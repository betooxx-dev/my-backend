import { toS3ChecksumSha256 } from './s3-checksum';

describe('toS3ChecksumSha256', () => {
  it('encodes the 32-byte SHA-256 digest as standard Base64', () => {
    expect(
      toS3ChecksumSha256(
        'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      ),
    ).toBe('ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0=');
  });

  it.each(['', 'abc', 'g'.repeat(64), 'a'.repeat(63)])(
    'rejects invalid SHA-256 hex %p',
    (value) => {
      expect(() => toS3ChecksumSha256(value)).toThrow(
        'SHA-256 must be 64 hexadecimal characters',
      );
    },
  );
});
