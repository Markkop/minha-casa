export const SUBSCRIPTION_COOKIE_NAME = "subscription-status";
export const SUBSCRIPTION_PAGE = "/subscribe";
export const SUBSCRIPTION_UNAVAILABLE_PAGE = "/acesso-indisponivel";

const SUBSCRIPTION_REQUIRED_ROUTES = [
  "/visao-geral",
  "/lista",
  "/anuncios",
  "/comparacao",
  "/analise",
  "/imoveis",
  "/links",
  "/contatos",
  "/regioes",
  "/condominios"
];

export function requiresSubscription(pathname: string): boolean {
  return SUBSCRIPTION_REQUIRED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}
