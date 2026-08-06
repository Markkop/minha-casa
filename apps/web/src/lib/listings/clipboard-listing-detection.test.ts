import { describe, expect, it } from "vitest";
import { looksLikeUrl } from "./clipboard-listing-detection";

describe("looksLikeUrl", () => {
  it("accepts absolute http(s) urls", () => {
    expect(looksLikeUrl("https://vivareal.com.br/property/ap123")).toBe(true);
  });

  it("accepts bare domains with a path", () => {
    expect(looksLikeUrl("vivareal.com.br/property/ap123")).toBe(true);
  });

  it("rejects free-form listing text", () => {
    expect(looksLikeUrl("apartamento 2 bedrooms")).toBe(false);
  });
});
