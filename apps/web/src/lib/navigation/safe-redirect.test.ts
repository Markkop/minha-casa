import { describe, expect, it } from "vitest";
import {
  authRouteWithRedirect,
  isSafeRedirectPath,
  safeRedirectPath
} from "./safe-redirect";

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

describe("authRouteWithRedirect", () => {
  it("preserves an invite path when switching authentication screens", () => {
    expect(authRouteWithRedirect("/signup", "/convites/invite-token")).toBe(
      "/signup?redirect=%2Fconvites%2Finvite-token"
    );
    expect(authRouteWithRedirect("/login", "/convites/invite-token")).toBe(
      "/login?redirect=%2Fconvites%2Finvite-token"
    );
  });

  it("does not propagate unsafe external redirects", () => {
    expect(authRouteWithRedirect("/login", "https://example.com")).toBe(
      "/login?redirect=%2Fanuncios"
    );
  });
});
