export function isSafeRedirectPath(path: string | null): path is string {
  if (!path) return false;
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  if (path.includes("://")) return false;
  return true;
}

export function safeRedirectPath(path: string | null, fallback = "/anuncios") {
  return isSafeRedirectPath(path) ? path : fallback;
}
