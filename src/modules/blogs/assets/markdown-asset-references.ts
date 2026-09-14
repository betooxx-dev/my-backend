// Match exact asset resource paths, including relative links, reference-style
// Markdown and percent-encoded URLs. Bare UUIDs are not asset references.
export function markdownAssetIds(markdown: string): Set<string> {
  const decoded = markdown.replace(/(?:%[0-9a-f]{2})+/gi, (part) => {
    try {
      return decodeURIComponent(part);
    } catch {
      return part;
    }
  });
  const paths =
    /\/blog\/assets\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?=$|[\s/?#)\]<>"'])/gi;
  return new Set(
    Array.from(decoded.matchAll(paths), (match) => match[1].toLowerCase()),
  );
}
