import { env } from "$env/dynamic/private";
import type { RequestHandler } from "./$types";

function phoenixBaseUrl(): string {
  const raw = env.PHOENIX_API_URL ?? env.PUBLIC_API_URL ?? "http://localhost:4000";
  return raw.trim().replace(/\/+$/, "").replace(/\/api$/i, "");
}

async function proxyToPhoenix({ request, params }: Parameters<RequestHandler>[0]) {
  const segments = params.path ? (Array.isArray(params.path) ? params.path : [params.path]) : [];
  const target = new URL(`/api/${segments.map(String).join("/")}`, phoenixBaseUrl());
  target.search = new URL(request.url).search;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");

  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined
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
