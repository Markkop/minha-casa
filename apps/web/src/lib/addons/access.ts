/** TODO: Replace with backend-driven per-user/org addon grants once billing is wired end-to-end. */
export const ADDONS_OPEN_ACCESS = true;

export const ADDON_OPEN_ROUTES = [
  "/addons",
  "/floodrisk",
  "/planta",
  "/financeiro",
  "/financiamento",
  "/casa"
] as const;

export function isAddonOpenRoute(pathname: string): boolean {
  return ADDON_OPEN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

/** TODO: call addonsApi.fetchAccess(slug) when ADDONS_OPEN_ACCESS is false. */
export function hasAddonAccess(_slug: string): boolean {
  return ADDONS_OPEN_ACCESS;
}
