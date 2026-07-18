export function isSafeRedirectPath(path: string | null): path is string {
  if (!path) return false;
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  if (path.includes("://")) return false;
  if (path.includes("\\")) return false;
  return true;
}

export function safeRedirectPath(path: string | null, fallback = "/lista") {
  return isSafeRedirectPath(path) ? path : fallback;
}

export function authRouteWithRedirect(
  route: "/login" | "/signup",
  redirectPath: string | null
) {
  const safePath = safeRedirectPath(redirectPath);
  return `${route}?redirect=${encodeURIComponent(safePath)}`;
}
