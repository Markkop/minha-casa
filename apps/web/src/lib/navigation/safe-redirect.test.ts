import { describe, expect, it } from "vitest";
import { isSafeRedirectPath, safeRedirectPath } from "./safe-redirect";

describe("safe redirects", () => {
  it("accepts internal absolute paths", () => {
    expect(isSafeRedirectPath("/anuncios")).toBe(true);
    expect(safeRedirectPath("/anuncios?share=1")).toBe("/anuncios?share=1");
  });

  it("rejects external and protocol-relative paths", () => {
    expect(isSafeRedirectPath("https://example.com")).toBe(false);
    expect(isSafeRedirectPath("//example.com")).toBe(false);
    expect(isSafeRedirectPath("anuncios")).toBe(false);
    expect(safeRedirectPath("https://example.com")).toBe("/anuncios");
  });
});
