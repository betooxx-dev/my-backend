const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/i;

export function toS3ChecksumSha256(value: string): string {
  if (!SHA256_HEX_PATTERN.test(value)) {
    throw new Error('SHA-256 must be 64 hexadecimal characters');
  }

  return Buffer.from(value, 'hex').toString('base64');
}
