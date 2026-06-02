const PUBLIC_GET_PATH_PATTERNS = [
  /^\/plans$/,
  /^\/shared\/[^/]+$/,
  /^\/shared\/[^/]+\/listings\/[^/]+\/images\/[^/]+$/,
  /^\/collections\/public$/,
  /^\/collections\/public\/[^/]+$/,
  /^\/short-links\/[^/]+$/
];

const PUBLIC_METHOD_PATHS = new Set(["POST /webhooks/stripe"]);

type TokenResult = { token?: string | null } | null | undefined;

export type MintApiToken = (headers: Headers) => Promise<TokenResult>;

export function isPublicPhoenixApiPath(path: string, method: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const normalizedMethod = method.toUpperCase();

  if (normalizedMethod === "OPTIONS") return true;
  if (PUBLIC_METHOD_PATHS.has(`${normalizedMethod} ${normalizedPath}`)) return true;
  if (normalizedMethod === "GET") {
    return PUBLIC_GET_PATH_PATTERNS.some((pattern) => pattern.test(normalizedPath));
  }

  return false;
}

export async function resolvePhoenixAuthorization({
  headers,
  path,
  method,
  mintToken
}: {
  headers: Headers;
  path: string;
  method: string;
  mintToken: MintApiToken;
}) {
  const authRequired = !isPublicPhoenixApiPath(path, method);
  if (!authRequired) {
    return { authRequired, authorization: null };
  }

  try {
    const result = await mintToken(headers);
    if (result?.token) {
      return { authRequired, authorization: `Bearer ${result.token}` };
    }
  } catch (error) {
    if (authRequired) {
      console.warn("[api proxy] failed to mint Better Auth JWT", error);
    }
  }

  return { authRequired, authorization: null };
}
