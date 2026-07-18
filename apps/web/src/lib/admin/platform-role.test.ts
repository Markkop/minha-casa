import { describe, expect, it } from "vitest";
import { isPlatformSuperAdmin } from "./platform-role";

describe("isPlatformSuperAdmin", () => {
  it("keeps compatibility with the legacy isAdmin field", () => {
    expect(isPlatformSuperAdmin({ isAdmin: true })).toBe(true);
  });

  it("accepts the explicit platform role fields", () => {
    expect(isPlatformSuperAdmin({ isSuperAdmin: true, isAdmin: false })).toBe(true);
    expect(isPlatformSuperAdmin({ superAdmin: true, isAdmin: false })).toBe(true);
  });

  it("does not grant access to users without a global role", () => {
    expect(isPlatformSuperAdmin({ isAdmin: false })).toBe(false);
    expect(isPlatformSuperAdmin(undefined)).toBe(false);
  });
});
