import { authClient } from "$lib/auth-client";

export const session = authClient.useSession();

let cachedJwt: string | null = null;
let jwtExpiresAt = 0;
let pendingJwt: Promise<string | null> | null = null;

export async function getApiToken(): Promise<string | null> {
  const now = Date.now();
  if (cachedJwt && jwtExpiresAt - now > 2 * 60 * 1000) {
    return cachedJwt;
  }
  if (pendingJwt) return pendingJwt;

  pendingJwt = (async () => {
    try {
      const res = await authClient.token();
      if (res.error) {
        console.warn("[auth] JWT token request failed:", res.error.message ?? res.error);
        return null;
      }
      if (res.data?.token) {
        cachedJwt = res.data.token;
        jwtExpiresAt = now + 55 * 60 * 1000;
        return cachedJwt;
      }
    } catch (error) {
      console.warn("[auth] JWT token request failed:", error);
    }

    cachedJwt = null;
    jwtExpiresAt = 0;
    return null;
  })();

  try {
    return await pendingJwt;
  } finally {
    pendingJwt = null;
  }
}

export function clearCachedToken() {
  cachedJwt = null;
  jwtExpiresAt = 0;
  pendingJwt = null;
}
