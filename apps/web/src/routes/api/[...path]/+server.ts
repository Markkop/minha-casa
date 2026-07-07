import { env } from "$env/dynamic/private";
import { getAuth } from "$lib/auth";
import { ACTIVE_ORGANIZATION_COOKIE_NAME } from "$lib/organization-context";
import { resolvePhoenixAuthorization } from "$lib/server/api-proxy-auth";
import { preparePhoenixRequest } from "$lib/server/api-proxy-request";
import type { RequestHandler } from "./$types";

function phoenixBaseUrl(): string {
  const raw = env.PHOENIX_API_URL ?? env.PUBLIC_API_URL ?? "http://localhost:4000";
  return raw.trim().replace(/\/+$/, "").replace(/\/api$/i, "");
}

async function proxyToPhoenix({
  request,
  params,
  cookies
}: Parameters<RequestHandler>[0]) {
  const segments = params.path ? (Array.isArray(params.path) ? params.path : [params.path]) : [];
  const apiPath = `/${segments.map(String).join("/")}`;
  const target = new URL(`/api/${segments.map(String).join("/")}`, phoenixBaseUrl());
  target.search = new URL(request.url).search;

  const preparedRequest = await preparePhoenixRequest(request, request.headers);
  const { headers } = preparedRequest;

  const organizationOverride = request.headers
    .get("X-Minha-Casa-Organization-Override")
    ?.trim();
  headers.delete("X-Minha-Casa-Organization-Override");

  const activeOrgId =
    organizationOverride === "personal"
      ? null
      : organizationOverride || cookies.get(ACTIVE_ORGANIZATION_COOKIE_NAME)?.trim();
  if (activeOrgId) {
    headers.set("X-Organization-Id", activeOrgId);
  } else {
    headers.delete("X-Organization-Id");
  }

  const { authRequired, authorization } = await resolvePhoenixAuthorization({
    headers: request.headers,
    path: apiPath,
    method: request.method,
    mintToken: async (authHeaders) =>
      (getAuth().api as unknown as { getToken: (input: { headers: Headers }) => Promise<{ token?: string }> }).getToken({
        headers: authHeaders
      })
  });

  if (authorization) {
    headers.set("Authorization", authorization);
  } else {
    headers.delete("Authorization");
    if (authRequired) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: preparedRequest.body
    });
  } catch (error) {
    console.error("[api proxy] Phoenix unreachable", target.toString(), error);
    return new Response(
      JSON.stringify({
        error: `Cannot reach Phoenix at ${phoenixBaseUrl()}`,
        detail: error instanceof Error ? error.message : String(error),
        hint: "Start the app stack: docker compose -f infra/local/docker-compose.app.yml up -d phoenix-api"
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("transfer-encoding");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders
  });
}

export const GET: RequestHandler = proxyToPhoenix;
export const POST: RequestHandler = proxyToPhoenix;
export const PUT: RequestHandler = proxyToPhoenix;
export const PATCH: RequestHandler = proxyToPhoenix;
export const DELETE: RequestHandler = proxyToPhoenix;
export const OPTIONS: RequestHandler = proxyToPhoenix;
