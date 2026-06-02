import { describe, expect, it, vi } from "vitest";
import type { Cookies } from "@sveltejs/kit";
import { SUBSCRIPTION_ACTIVE, SUBSCRIPTION_COOKIE_NAME } from "$lib/subscription";
import { setSubscriptionStatusCookie } from "./subscription-status";

vi.mock("@minha-casa/db", () => ({
  and: vi.fn(),
  desc: vi.fn(),
  eq: vi.fn(),
  getDb: vi.fn(),
  plans: {},
  subscriptions: {}
}));

describe("setSubscriptionStatusCookie", () => {
  it("writes the httpOnly subscription cookie", () => {
    const expiresAt = new Date("2026-06-02T10:00:00.000Z");
    const calls: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
    const cookies = {
      set: (name: string, value: string, options: Record<string, unknown>) =>
        calls.push({ name, value, options })
    } as unknown as Cookies;

    setSubscriptionStatusCookie(cookies, SUBSCRIPTION_ACTIVE, expiresAt);

    expect(calls).toEqual([
      {
        name: SUBSCRIPTION_COOKIE_NAME,
        value: "active|2026-06-02T10:00:00.000Z",
        options: {
          httpOnly: true,
          secure: false,
          sameSite: "lax",
          path: "/",
          maxAge: 3600
        }
      }
    ]);
  });
});
