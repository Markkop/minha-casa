import { describe, expect, it } from "vitest";
import { resolveAuthMode } from "./auth-mode";

describe("resolveAuthMode", () => {
  it("resolves the signup route", () => {
    expect(resolveAuthMode("/signup")).toBe("signup");
  });

  it("resolves the login route", () => {
    expect(resolveAuthMode("/login")).toBe("login");
  });

  it("falls back safely to login for an unexpected pathname", () => {
    expect(resolveAuthMode("/unexpected")).toBe("login");
  });
});
