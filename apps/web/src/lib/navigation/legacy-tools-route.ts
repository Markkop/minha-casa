export function buildLegacyToolsRedirectUrl(url: URL): string {
  return `/ferramentas${url.search}`;
}
