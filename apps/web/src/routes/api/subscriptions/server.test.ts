import { beforeEach, describe, expect, it, vi } from "vitest";

const accessMocks = vi.hoisted(() => ({
  getSubscriptionAccess: vi.fn()
}));

vi.mock("$lib/server/load-env", () => ({}));
vi.mock("$lib/server/subscription-access", () => accessMocks);
vi.mock("@minha-casa/db", () => ({
  and: vi.fn(),
  eq: vi.fn(),
  getDb: vi.fn(),
  plans: {},
  subscriptions: {},
  users: {}
}));

import { GET } from "./+server";

async function callGet(locals: Record<string, unknown>) {
  return GET({ locals } as never) as Promise<Response>;
}

describe("GET /api/subscriptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without resolving access when there is no authenticated user", async () => {
    const response = await callGet({});

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(accessMocks.getSubscriptionAccess).not.toHaveBeenCalled();
  });

  it("returns the explicit active access contract", async () => {
    const subscription = {
      id: "subscription-1",
      status: "active",
      expiresAt: new Date("2026-08-01T00:00:00.000Z")
    };
    const plan = { id: "plan-pro", slug: "pro" };
    const locals = { user: { id: "user-1" } };
    accessMocks.getSubscriptionAccess.mockResolvedValue({
      state: "active",
      source: "subscription",
      subscription,
      plan
    });

    const response = await callGet(locals);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      accessStatus: "active",
      hasActiveSubscription: true,
      subscription: {
        ...subscription,
        expiresAt: "2026-08-01T00:00:00.000Z"
      },
      plan
    });
    expect(accessMocks.getSubscriptionAccess).toHaveBeenCalledWith(locals);
  });

  it("returns an explicit inactive response only for a resolved absence of access", async () => {
    accessMocks.getSubscriptionAccess.mockResolvedValue({
      state: "inactive",
      subscription: null,
      plan: null
    });

    const response = await callGet({ user: { id: "user-1" } });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      accessStatus: "inactive",
      hasActiveSubscription: false,
      subscription: null,
      plan: null
    });
  });

  it("returns 503 when access validation is unavailable", async () => {
    accessMocks.getSubscriptionAccess.mockResolvedValue({
      state: "unavailable",
      subscription: null,
      plan: null,
      error: new Error("database unavailable")
    });

    const response = await callGet({ user: { id: "user-1" } });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Subscription validation is temporarily unavailable"
    });
  });
});
