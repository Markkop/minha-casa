import { ADDONS_OPEN_ACCESS, isAddonOpenRoute } from "$lib/addons/access";

export const SUBSCRIPTION_COOKIE_NAME = "subscription-status";
export const SUBSCRIPTION_ACTIVE = "active";
export const SUBSCRIPTION_INACTIVE = "inactive";
export const SUBSCRIPTION_PAGE = "/subscribe";

const COOKIE_SEPARATOR = "|";
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

export function parseSubscriptionCookie(cookieValue: string | undefined) {
  if (!cookieValue) return null;
  const separatorIndex = cookieValue.indexOf(COOKIE_SEPARATOR);
  if (separatorIndex === -1) return null;

  const status = cookieValue.substring(0, separatorIndex);
  const expiresAt = new Date(cookieValue.substring(separatorIndex + 1));
  if (!status || Number.isNaN(expiresAt.getTime())) return null;
  return { status, expiresAt };
}

export function createSubscriptionCookieValue(status: string, expiresAt: Date): string {
  return `${status}${COOKIE_SEPARATOR}${expiresAt.toISOString()}`;
}

export function isSubscriptionValid(cookieValue: string | undefined): boolean {
  const parsed = parseSubscriptionCookie(cookieValue);
  return Boolean(parsed && parsed.status === SUBSCRIPTION_ACTIVE && parsed.expiresAt >= new Date());
}

export function requiresSubscription(pathname: string): boolean {
  if (ADDONS_OPEN_ACCESS && isAddonOpenRoute(pathname)) {
    return false;
  }

  return SUBSCRIPTION_REQUIRED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}
