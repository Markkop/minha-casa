import { describe, expect, it } from "vitest";
import { buildJsonRequestParts } from "./request-init";

describe("buildJsonRequestParts", () => {
  it("does not add a body or content type when no payload is provided", () => {
    const result = buildJsonRequestParts(undefined);

    expect(result.body).toBeUndefined();
    expect(result.headers.has("Content-Type")).toBe(false);
  });

  it("serializes payloads and adds the default JSON content type", () => {
    const result = buildJsonRequestParts({ name: "Casa" });

    expect(result.body).toBe('{"name":"Casa"}');
    expect(result.headers.get("Content-Type")).toBe("application/json");
  });

  it("preserves an explicitly supplied content type", () => {
    const result = buildJsonRequestParts("raw", { "Content-Type": "text/plain" });

    expect(result.body).toBe('"raw"');
    expect(result.headers.get("Content-Type")).toBe("text/plain");
  });
});
