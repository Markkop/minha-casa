export async function preparePhoenixRequest(
  request: Request,
  sourceHeaders: Headers
): Promise<{ headers: Headers; body?: ArrayBuffer }> {
  const headers = new Headers(sourceHeaders);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("transfer-encoding");

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
