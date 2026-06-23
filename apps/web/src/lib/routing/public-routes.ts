/** Paths reachable without authentication (marketing and connect flows). */
export const PUBLIC_ROUTE_PATHS = [
  "/",
  "/login",
  "/signup",
  "/privacy",
  "/terms",
  "/data-deletion",
  "/subscribe",
  "/planos",
  "/conectar-whatsapp",
  "/conectar-telegram"
] as const;

export const PUBLIC_ROUTES = new Set<string>(PUBLIC_ROUTE_PATHS);

export function isPublicShortLink(pathname: string) {
  return /^\/s\/[a-z0-9]{4,12}$/i.test(pathname);
}

export function isPublicShare(pathname: string) {
  return pathname.startsWith("/share/");
}

export function isPublicFinanceiroSnapshot(pathname: string) {
  return /^\/financeiro\/s\/[^/]+$/.test(pathname);
}

export function isPublicGeocodingApi(pathname: string) {
  return pathname === "/api/geocoding/nominatim";
}

export function isPublicRoute(pathname: string) {
  return (
    PUBLIC_ROUTES.has(pathname) ||
    isPublicShortLink(pathname) ||
    isPublicShare(pathname) ||
    isPublicFinanceiroSnapshot(pathname) ||
    isPublicGeocodingApi(pathname)
  );
}
