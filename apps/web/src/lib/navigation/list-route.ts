export const LIST_ROUTE = "/lista";

export function buildListRedirectUrl(url: URL): string {
  return `${LIST_ROUTE}${url.search}`;
}
