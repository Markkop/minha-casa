import { beforeEach, describe, expect, it, vi } from "vitest";

const phoenixMocks = vi.hoisted(() => ({
  fetchPhoenixApi: vi.fn()
}));

vi.mock("$lib/server/phoenix-api", () => phoenixMocks);

import { getSubscriptionAccess, resolveSubscriptionAccess } from "./subscription-access";

const requestHeaders = new Headers({ cookie: "better-auth.session_token=session" });

function phoenixResponse(body: unknown, status = 200) {
  phoenixMocks.fetchPhoenixApi.mockResolvedValue(
    Response.json(body, { status })
  );
}

describe("resolveSubscriptionAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps Phoenix's active subscription contract", async () => {
    const subscription = {
      id: "subscription-1",
      userId: "user-1",
      planId: "plan-pro",
      status: "active",
      expiresAt: "2026-08-01T00:00:00.000Z"
    };
    const plan = { id: "plan-pro", name: "Pro", slug: "pro", isActive: true };
    phoenixResponse({
      accessStatus: "active",
      hasActiveSubscription: true,
      subscription,
      plan
    });

    await expect(
      resolveSubscriptionAccess({ id: "user-1" }, requestHeaders)
    ).resolves.toEqual({
      state: "active",
      source: "subscription",
      subscription,
      plan
    });
    expect(phoenixMocks.fetchPhoenixApi).toHaveBeenCalledWith("/subscriptions", {
      headers: requestHeaders
    });
  });

  it("keeps Free access for a user without an active subscription", async () => {
    phoenixResponse({
      accessStatus: "inactive",
      hasActiveSubscription: false,
      subscription: null,
      plan: null
    });

    await expect(
      resolveSubscriptionAccess({ id: "admin-1", isAdmin: true }, requestHeaders)
    ).resolves.toEqual({
      state: "active",
      source: "free",
      subscription: null,
      plan: null
    });
  });

  it("returns unavailable when Phoenix cannot validate access", async () => {
    phoenixResponse({ error: "unavailable" }, 503);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const access = await resolveSubscriptionAccess({ id: "user-1" }, requestHeaders);

    expect(access).toMatchObject({
      state: "unavailable",
      subscription: null,
      plan: null,
      error: expect.any(Error)
    });
    expect(consoleError).toHaveBeenCalledWith("[subscription-access] resolution failed", {
      userId: "user-1",
      error: expect.any(Error)
    });
    consoleError.mockRestore();
  });

  it("fails closed on a malformed active response", async () => {
    phoenixResponse({
      accessStatus: "active",
      hasActiveSubscription: true,
      subscription: null,
      plan: null
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      resolveSubscriptionAccess({ id: "user-1" }, requestHeaders)
    ).resolves.toMatchObject({ state: "unavailable" });
  });
});

describe("getSubscriptionAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns inactive without calling Phoenix for an unauthenticated request", async () => {
    const locals = {} as App.Locals;

    await expect(getSubscriptionAccess(locals, requestHeaders)).resolves.toEqual({
      state: "inactive",
      subscription: null,
      plan: null
    });
    expect(phoenixMocks.fetchPhoenixApi).not.toHaveBeenCalled();
  });

  it("shares one Phoenix lookup within the same request", async () => {
    phoenixResponse({
      accessStatus: "inactive",
      hasActiveSubscription: false,
      subscription: null,
      plan: null
    });
    const locals = { user: { id: "user-1" } } as App.Locals;

    const first = getSubscriptionAccess(locals, requestHeaders);
    const second = getSubscriptionAccess(locals, requestHeaders);

    expect(second).toBe(first);
    await expect(first).resolves.toMatchObject({ state: "active", source: "free" });
    expect(phoenixMocks.fetchPhoenixApi).toHaveBeenCalledTimes(1);
  });
});
