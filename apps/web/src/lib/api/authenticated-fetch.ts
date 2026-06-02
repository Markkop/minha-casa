type TokenResponse = { token?: string };

export class MissingAuthTokenError extends Error {
  constructor() {
    super("Missing authentication token");
    this.name = "MissingAuthTokenError";
  }
}

export async function fetchWithBetterAuthJwt(
  fetchFn: typeof fetch,
  input: string,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers);
  const tokenResponse = await fetchFn("/api/auth/token");
  if (tokenResponse.ok) {
    const payload = (await tokenResponse.json().catch(() => null)) as TokenResponse | null;
    if (payload?.token) {
      headers.set("Authorization", `Bearer ${payload.token}`);
    }
  }

  if (!headers.has("Authorization")) {
    throw new MissingAuthTokenError();
  }

  return fetchFn(input, { ...init, headers });
}
