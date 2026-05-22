const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
])

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map((p) => Number.parseInt(p, 10))
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false
  const [a, b] = parts
  if (a === 10) return true
  if (a === 127) return true
  if (a === 0) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  return false
}

function isPrivateIpv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "")
  if (normalized === "::1") return true
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true
  if (normalized.startsWith("fe80")) return true
  return false
}

/**
 * Validates a user-supplied URL for server-side fetching (SSRF-safe).
 * Only http/https; blocks localhost and private networks.
 */
export function validatePublicHttpUrl(raw: string): URL {
  const trimmed = raw.trim()
  if (!trimmed) {
    throw new Error("INVALID_URL")
  }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new Error("INVALID_URL")
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("INVALID_URL")
  }

  if (parsed.username || parsed.password) {
    throw new Error("INVALID_URL")
  }

  const hostname = parsed.hostname.toLowerCase()
  if (!hostname) {
    throw new Error("INVALID_URL")
  }

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new Error("INVALID_URL")
  }

  if (hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new Error("INVALID_URL")
  }

  if (isPrivateIpv4(hostname) || isPrivateIpv6(hostname)) {
    throw new Error("INVALID_URL")
  }

  return parsed
}
