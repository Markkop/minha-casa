import { describe, expect, it } from "vitest";
import { ADDON_OPEN_ROUTES, isAddonOpenRoute } from "./access";

describe("isAddonOpenRoute", () => {
  it("matches catalog addon routes and subpaths", () => {
    for (const route of ADDON_OPEN_ROUTES) {
      expect(isAddonOpenRoute(route)).toBe(true);
      expect(isAddonOpenRoute(`${route}/extra`)).toBe(true);
    }
  });

  it("does not match core workspace routes", () => {
    expect(isAddonOpenRoute("/anuncios")).toBe(false);
    expect(isAddonOpenRoute("/comparacao")).toBe(false);
    expect(isAddonOpenRoute("/subscribe")).toBe(false);
  });

  it("does not match admin-gated addon routes", () => {
    expect(isAddonOpenRoute("/explorar")).toBe(false);
    expect(isAddonOpenRoute("/analise")).toBe(false);
  });
});
