const BLOCKED_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"]);

const MSG_INVALID_URL = "Informe uma URL válida com http:// ou https://.";
const MSG_LOCALHOST = "Links de localhost não são suportados.";
const MSG_PRIVATE_NETWORK = "Links de rede privada não são suportados.";

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function isPrivateIpv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("fe80")) return true;
  return false;
}

function isLocalHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(lower)) return true;
  if (lower.endsWith(".localhost") || lower.endsWith(".local")) return true;
  return false;
}

/** Prepends https:// when the user omits a scheme (matches inline add behavior). */
export function normalizeListingUrlInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * Ensures a listing URL is safe to send for server-side fetch (public http/https only).
 * Throws with a Portuguese message suitable for UI display.
 */
export function assertPublicListingUrl(raw: string): void {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error(MSG_INVALID_URL);
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(MSG_INVALID_URL);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(MSG_INVALID_URL);
  }

  if (parsed.username || parsed.password) {
    throw new Error(MSG_INVALID_URL);
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname) {
    throw new Error(MSG_INVALID_URL);
  }

  if (isLocalHostname(hostname)) {
    throw new Error(MSG_LOCALHOST);
  }

  if (isPrivateIpv4(hostname) || isPrivateIpv6(hostname)) {
    throw new Error(MSG_PRIVATE_NETWORK);
  }
}
