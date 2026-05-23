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

export function backendHeaders(userId: string, orgId?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-minha-casa-user-id": userId,
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
