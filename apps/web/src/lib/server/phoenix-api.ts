import "$lib/server/load-env";
import { getAuth } from "$lib/auth";

export class PhoenixApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "PhoenixApiError";
  }
}

function phoenixBaseUrl(): string {
  const raw = process.env.PHOENIX_API_URL ?? process.env.PUBLIC_API_URL ?? "http://localhost:4000";
  return raw.trim().replace(/\/+$/, "").replace(/\/api$/i, "");
}

async function authorizationHeader(headers: Headers): Promise<string> {
  const result = await (
    getAuth().api as unknown as {
      getToken: (input: { headers: Headers }) => Promise<{ token?: string | null }>;
    }
  ).getToken({ headers });

  if (!result?.token) {
    throw new PhoenixApiError("Unable to mint an API token", 401);
  }

  return `Bearer ${result.token}`;
}

export async function fetchPhoenixApi(
  path: string,
  options: {
    headers: Headers;
    method?: string;
    organizationId?: string | null;
    body?: BodyInit | null;
  }
): Promise<Response> {
  const requestHeaders = new Headers();
  requestHeaders.set("Authorization", await authorizationHeader(options.headers));

  if (options.organizationId) {
    requestHeaders.set("X-Organization-Id", options.organizationId);
  }

  return fetch(new URL(`/api/${path.replace(/^\/+/, "")}`, phoenixBaseUrl()), {
    method: options.method ?? "GET",
    headers: requestHeaders,
    body: options.body,
    cache: "no-store"
  });
}
