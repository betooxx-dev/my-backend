import { markdownAssetIds } from './markdown-asset-references';

const id = '12345678-1234-4234-8234-123456789abc';
describe('Markdown asset protection', () => {
  it.each([
    `![alt](http://localhost:5001/api/blog/assets/${id})`,
    `![alt](/api/blog/assets/${id}?width=1 "title")`,
    `![alt](/api/blog/assets/${id}/)`,
    `![alt][cover]\n[cover]: /api/blog/assets/${id}`,
    `<img src="/api/blog/assets/${id}">`,
    `/api/blog/assets/${id.toUpperCase()}#fragment`,
    encodeURI(`/api/blog/assets/${id}`).replaceAll('/', '%2F'),
  ])('recognizes an exact resource: %s', (markdown) => {
    expect(markdownAssetIds(markdown).has(id)).toBe(true);
  });
  it.each([
    id,
    `/api/blog/assets/${id}0`,
    `/api/blog/assets/${id}.png`,
    `unrelated/${id}`,
  ])('ignores non-resource UUIDs: %s', (markdown) => {
    expect(markdownAssetIds(markdown).size).toBe(0);
  });
});
