import type { Cookies } from "@sveltejs/kit";

function splitSetCookieHeader(header: string) {
  const cookies: string[] = [];
  let start = 0;
  let inExpires = false;

  for (let index = 0; index < header.length; index += 1) {
    const rest = header.slice(index).toLowerCase();
    if (rest.startsWith("expires=")) {
      inExpires = true;
      index += "expires=".length - 1;
      continue;
    }
    if (inExpires && header[index] === ";") {
      inExpires = false;
      continue;
    }
    if (header[index] === ",") {
      const next = header.slice(index + 1).trimStart();
      if (/^[^=;,]+=/.test(next)) {
        cookies.push(header.slice(start, index).trim());
        start = index + 1;
        inExpires = false;
      }
    }
  }

  cookies.push(header.slice(start).trim());
  return cookies.filter(Boolean);
}

function getSetCookieHeaders(headers: Headers) {
  if (typeof headers.getSetCookie === "function") {
    const values = headers.getSetCookie();
    if (values.length > 0) return values.flatMap(splitSetCookieHeader);
  }

  const fallback = headers.get("set-cookie");
  return fallback ? splitSetCookieHeader(fallback) : [];
}

function parseSetCookie(header: string) {
  const parts = header.split(";").map((part) => part.trim());
  const [nameValue, ...attributes] = parts;
  const separator = nameValue.indexOf("=");
  if (separator === -1) return null;

  const name = nameValue.slice(0, separator);
  const value = nameValue.slice(separator + 1);
  const options: {
    path?: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "strict" | "lax" | "none";
    maxAge?: number;
    expires?: Date;
  } = { path: "/" };

  for (const attribute of attributes) {
    const [rawKey, rawValue] = attribute.split("=");
    const key = rawKey.toLowerCase();
    if (key === "httponly") options.httpOnly = true;
    if (key === "secure") options.secure = true;
    if (key === "path" && rawValue) options.path = rawValue;
    if (key === "samesite" && rawValue) {
      const normalized = rawValue.toLowerCase();
      if (normalized === "strict" || normalized === "lax" || normalized === "none") {
        options.sameSite = normalized;
      }
    }
    if (key === "max-age" && rawValue) {
      const maxAge = Number.parseInt(rawValue, 10);
      if (!Number.isNaN(maxAge)) options.maxAge = maxAge;
    }
    if (key === "expires" && rawValue) {
      const expires = new Date(rawValue);
      if (!Number.isNaN(expires.getTime())) options.expires = expires;
    }
  }

  return { name, value, options };
}

export function applyAuthResponseCookies(response: Response, cookies: Cookies) {
  for (const header of getSetCookieHeaders(response.headers)) {
    const parsed = parseSetCookie(header);
    if (!parsed) continue;
    const { path = "/", httpOnly, secure, sameSite, maxAge, expires } = parsed.options;
    cookies.set(parsed.name, parsed.value, {
      path,
      httpOnly,
      secure,
      sameSite: sameSite as "strict" | "lax" | "none" | undefined,
      maxAge,
      expires
    });
  }
}
