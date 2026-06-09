export function buildJsonRequestParts(
  body: unknown,
  headers: Record<string, string> = {}
): { headers: Headers; body?: string } {
  const requestHeaders = new Headers(headers);

  if (body === undefined) {
    return { headers: requestHeaders };
  }

  if (!requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  return {
    headers: requestHeaders,
    body: JSON.stringify(body)
  };
}
