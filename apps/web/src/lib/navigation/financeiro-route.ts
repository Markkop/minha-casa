export const FINANCEIRO_ROUTE = "/financeiro";

export function buildFinanceiroRedirectUrl(url: URL): string {
  return `${FINANCEIRO_ROUTE}${url.search}`;
}
