import { ADDONS_OPEN_ACCESS, isAddonOpenRoute } from "$lib/addons/access";

export const SUBSCRIPTION_COOKIE_NAME = "subscription-status";
export const SUBSCRIPTION_PAGE = "/subscribe";
export const SUBSCRIPTION_UNAVAILABLE_PAGE = "/acesso-indisponivel";

const SUBSCRIPTION_REQUIRED_ROUTES = [
  "/visao-geral",
  "/anuncios",
  "/comparacao",
  "/analise",
  "/financeiro",
  "/financiamento",
  "/casa",
  "/links",
  "/addons",
  "/contatos",
  "/regioes",
  "/condominios",
  "/floodrisk"
];

export function requiresSubscription(pathname: string): boolean {
  if (ADDONS_OPEN_ACCESS && isAddonOpenRoute(pathname)) {
    return false;
  }

  return SUBSCRIPTION_REQUIRED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}
