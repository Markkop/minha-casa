import { describe, expect, it, vi } from "vitest";
import { isPublicPhoenixApiPath, resolvePhoenixAuthorization } from "./api-proxy-auth";

describe("isPublicPhoenixApiPath", () => {
  it("keeps public Phoenix routes auth-optional", () => {
    expect(isPublicPhoenixApiPath("/plans", "GET")).toBe(true);
    expect(isPublicPhoenixApiPath("/organization-invites/token", "GET")).toBe(true);
    expect(isPublicPhoenixApiPath("/shared/token", "GET")).toBe(true);
    expect(isPublicPhoenixApiPath("/financeiro/snapshots/token", "GET")).toBe(true);
    expect(isPublicPhoenixApiPath("/collections/public/id", "GET")).toBe(true);
    expect(isPublicPhoenixApiPath("/webhooks/stripe", "POST")).toBe(true);
  });

  it("requires auth for protected Phoenix routes", () => {
    expect(isPublicPhoenixApiPath("/organizations", "GET")).toBe(false);
    expect(isPublicPhoenixApiPath("/financeiro/snapshots", "POST")).toBe(false);
    expect(isPublicPhoenixApiPath("/organization-invites/token/accept", "POST")).toBe(false);
    expect(isPublicPhoenixApiPath("/user/addons", "GET")).toBe(false);
    expect(isPublicPhoenixApiPath("/addons/access/flood", "GET")).toBe(false);
  });
});

describe("resolvePhoenixAuthorization", () => {
  it("returns a bearer header when a JWT can be minted", async () => {
    const mintToken = vi.fn().mockResolvedValue({ token: "jwt" });

    await expect(
      resolvePhoenixAuthorization({
        headers: new Headers(),
        path: "/organizations",
        method: "GET",
        mintToken
      })
    ).resolves.toEqual({ authRequired: true, authorization: "Bearer jwt" });
  });

  it("returns a required missing-token result for protected routes", async () => {
    const mintToken = vi.fn().mockResolvedValue(null);

    await expect(
      resolvePhoenixAuthorization({
        headers: new Headers(),
        path: "/organizations",
        method: "GET",
        mintToken
      })
    ).resolves.toEqual({ authRequired: true, authorization: null });
  });

  it("allows public routes without a token", async () => {
    const mintToken = vi.fn().mockResolvedValue(null);

    await expect(
      resolvePhoenixAuthorization({
        headers: new Headers(),
        path: "/plans",
        method: "GET",
        mintToken
      })
    ).resolves.toEqual({ authRequired: false, authorization: null });
    expect(mintToken).not.toHaveBeenCalled();
  });
});
