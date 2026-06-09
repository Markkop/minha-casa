import { describe, expect, it } from "vitest";
import { preparePhoenixRequest } from "./api-proxy-request";

describe("preparePhoenixRequest", () => {
  it("forwards a bodyless DELETE without JSON headers or an empty body", async () => {
    const request = new Request("http://localhost/api/collections/1/listings/2", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" }
    });

    const result = await preparePhoenixRequest(request, request.headers);

    expect(result.body).toBeUndefined();
    expect(result.headers.has("Content-Type")).toBe(false);
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
