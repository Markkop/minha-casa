type TokenResponse = { token?: string };

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

  return fetchFn(input, { ...init, headers });
}
