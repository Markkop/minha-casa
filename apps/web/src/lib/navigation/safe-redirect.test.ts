import { describe, expect, it } from "vitest";
import {
  authRouteWithRedirect,
  isSafeRedirectPath,
  safeRedirectPath
} from "./safe-redirect";

describe("safe redirects", () => {
  it("accepts internal absolute paths", () => {
    expect(isSafeRedirectPath("/lista")).toBe(true);
    expect(safeRedirectPath("/lista?share=1")).toBe("/lista?share=1");
    expect(safeRedirectPath("/lista?colecao=Casa%20nova&ordem=price#mapa")).toBe(
      "/lista?colecao=Casa%20nova&ordem=price#mapa"
    );
  });

  it("rejects external and protocol-relative paths", () => {
    expect(isSafeRedirectPath("https://example.com")).toBe(false);
    expect(isSafeRedirectPath("//example.com")).toBe(false);
    expect(isSafeRedirectPath("anuncios")).toBe(false);
    expect(safeRedirectPath("https://example.com")).toBe("/lista");
  });

  it("rejects backslash-based network paths", () => {
    expect(isSafeRedirectPath("/\\\\example.com")).toBe(false);
    expect(safeRedirectPath("/\\\\example.com")).toBe("/lista");
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

  it("preserves the full internal path and query string", () => {
    expect(authRouteWithRedirect("/login", "/lista?colecao=abc&modo=mapa")).toBe(
      "/login?redirect=%2Flista%3Fcolecao%3Dabc%26modo%3Dmapa"
    );
  });

  it("does not propagate unsafe external redirects", () => {
    expect(authRouteWithRedirect("/login", "https://example.com")).toBe(
      "/login?redirect=%2Flista"
    );
  });
});
