import { authClient } from "$lib/auth-client";

export const session = authClient.useSession();

let cachedJwt: string | null = null;
let jwtExpiresAt = 0;

export async function getApiToken(): Promise<string | null> {
  const now = Date.now();
  if (cachedJwt && jwtExpiresAt - now > 2 * 60 * 1000) {
    return cachedJwt;
  }

  try {
    const res = await authClient.token();
    if (res.data?.token) {
      cachedJwt = res.data.token;
      jwtExpiresAt = now + 55 * 60 * 1000;
      return cachedJwt;
    }
  } catch {
    // Unauthenticated clients should make anonymous/public requests.
  }

  cachedJwt = null;
  jwtExpiresAt = 0;
  return null;
}

export function clearCachedToken() {
  cachedJwt = null;
  jwtExpiresAt = 0;
}
