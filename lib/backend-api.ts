/**
 * Server-side helpers for calling the Phoenix internal API.
 */

export function getBackendApiUrl(): string | null {
  const raw = process.env.INTERNAL_BACKEND_URL || process.env.BACKEND_API_URL
  if (!raw?.trim()) return null
  return raw.trim().replace(/^["']+|["']+$/g, "").replace(/\/+$/, "")
}

export function getInternalApiSecret(): string | undefined {
  const raw = process.env.INTERNAL_API_SECRET?.trim()
  if (!raw) return undefined
  return raw.replace(/^["']+|["']+$/g, "")
}

export function backendHeaders(
  userId: string,
  orgId?: string | null,
  isAdmin?: boolean
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-minha-casa-user-id": userId,
  }

  if (isAdmin) {
    headers["x-minha-casa-is-admin"] = "true"
  }

  if (orgId) {
    headers["x-minha-casa-org-id"] = orgId
  }

  const secret = getInternalApiSecret()
  if (secret) {
    headers.Authorization = `Bearer ${secret}`
  }

  return headers
}

export type BackendProxyOptions = {
  method: string
  userId: string
  orgId?: string | null
  isAdmin?: boolean
  body?: unknown
  searchParams?: Record<string, string | null | undefined>
}

/**
 * Proxies a request to the Phoenix internal API. Returns the raw Response.
 */
export async function proxyBackendRequest(
  path: string,
  options: BackendProxyOptions
): Promise<Response> {
  const backendUrl = getBackendApiUrl()
  if (!backendUrl) {
    return new Response(JSON.stringify({ error: "Backend API not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    })
  }

  const url = new URL(path.startsWith("/") ? path : `/${path}`, `${backendUrl}/`)

  if (options.searchParams) {
    for (const [key, value] of Object.entries(options.searchParams)) {
      if (value != null && value !== "") {
        url.searchParams.set(key, value)
      }
    }
  }

  const init: RequestInit = {
    method: options.method,
    headers: backendHeaders(options.userId, options.orgId ?? null, options.isAdmin),
  }

  if (options.body !== undefined && options.method !== "GET" && options.method !== "HEAD") {
    init.body = JSON.stringify(options.body)
  }

  return fetch(url.toString(), init)
}
