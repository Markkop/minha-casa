export async function preparePhoenixRequest(
  request: Request,
  sourceHeaders: Headers
): Promise<{ headers: Headers; body?: ArrayBuffer }> {
  const headers = new Headers(sourceHeaders);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("transfer-encoding");
  // Node fetch transparently decompresses upstream responses. Asking Phoenix
  // for identity encoding keeps the response body and transport headers aligned.
  headers.set("accept-encoding", "identity");

  if (request.body === null) {
    headers.delete("content-type");
    return { headers };
  }

  const body = await request.arrayBuffer();
  if (body.byteLength === 0) {
    headers.delete("content-type");
    return { headers };
  }

  return { headers, body };
}

export function preparePhoenixResponseHeaders(sourceHeaders: Headers): Headers {
  const headers = new Headers(sourceHeaders);
  headers.delete("transfer-encoding");
  headers.delete("content-encoding");
  headers.delete("content-length");
  return headers;
}
