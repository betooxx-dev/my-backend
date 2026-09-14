export function categoryName(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/gu, ' ');
}

export function categoryKey(value: string): string {
  return categoryName(value)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[\s\p{P}]+/gu, '');
}
