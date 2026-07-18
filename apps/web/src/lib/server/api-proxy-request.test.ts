import { describe, expect, it } from "vitest";
import {
  preparePhoenixRequest,
  preparePhoenixResponseHeaders
} from "./api-proxy-request";

describe("preparePhoenixRequest", () => {
  it("forwards a bodyless DELETE without JSON headers or an empty body", async () => {
    const request = new Request("http://localhost/api/collections/1/listings/2", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" }
    });

    const result = await preparePhoenixRequest(request, request.headers);

    expect(result.body).toBeUndefined();
    expect(result.headers.has("Content-Type")).toBe(false);
    expect(result.headers.get("Accept-Encoding")).toBe("identity");
  });

  it("preserves and forwards a JSON mutation body", async () => {
    const request = new Request("http://localhost/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Casas" })
    });

    const result = await preparePhoenixRequest(request, request.headers);

    expect(new TextDecoder().decode(result.body)).toBe('{"name":"Casas"}');
    expect(result.headers.get("Content-Type")).toBe("application/json");
  });
});

describe("preparePhoenixResponseHeaders", () => {
  it("removes transport metadata invalidated by response decompression", () => {
    const headers = preparePhoenixResponseHeaders(
      new Headers({
        "Content-Type": "application/json",
        "Content-Encoding": "gzip",
        "Content-Length": "609",
        "Transfer-Encoding": "chunked"
      })
    );

    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.has("Content-Encoding")).toBe(false);
    expect(headers.has("Content-Length")).toBe(false);
    expect(headers.has("Transfer-Encoding")).toBe(false);
  });
});
