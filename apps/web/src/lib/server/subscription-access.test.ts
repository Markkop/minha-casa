import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  and: vi.fn((...conditions: unknown[]) => ({ type: "and", conditions })),
  desc: vi.fn((column: unknown) => ({ type: "desc", column })),
  eq: vi.fn((column: unknown, value: unknown) => ({ type: "eq", column, value })),
  getDb: vi.fn(),
  gte: vi.fn((column: unknown, value: unknown) => ({ type: "gte", column, value }))
}));

vi.mock("@minha-casa/db", () => ({
  ...dbMocks,
  plans: {
    id: "plans.id"
  },
  subscriptions: {
    expiresAt: "subscriptions.expiresAt",
    planId: "subscriptions.planId",
    status: "subscriptions.status",
    userId: "subscriptions.userId"
  }
}));

import {
  getSubscriptionAccess,
  resolveSubscriptionAccess
} from "./subscription-access";

function mockSubscriptionQuery(result: unknown[] | Error) {
  const query = {
    select: vi.fn(),
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn()
  };

  query.select.mockReturnValue(query);
  query.from.mockReturnValue(query);
  query.innerJoin.mockReturnValue(query);
  query.where.mockReturnValue(query);
  query.orderBy.mockReturnValue(query);
  query.limit.mockImplementation(() =>
    result instanceof Error ? Promise.reject(result) : Promise.resolve(result)
  );
  dbMocks.getDb.mockReturnValue(query);

  return query;
}

describe("resolveSubscriptionAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-17T15:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("treats an administrator without a plan like any other Free user", async () => {
    mockSubscriptionQuery([]);

    await expect(
      resolveSubscriptionAccess({ id: "admin-1", isAdmin: true })
    ).resolves.toEqual({
      state: "active",
      source: "free",
      subscription: null,
      plan: null
    });

    expect(dbMocks.getDb).toHaveBeenCalledTimes(1);
  });

  it("returns the most recent active, unexpired subscription", async () => {
    const subscription = {
      id: "subscription-1",
      status: "active",
      expiresAt: new Date("2026-08-01T00:00:00.000Z")
    };
    const plan = { id: "plan-pro", slug: "pro", isActive: true };
    const query = mockSubscriptionQuery([{ subscription, plan }]);

    await expect(resolveSubscriptionAccess({ id: "user-1" })).resolves.toEqual({
      state: "active",
      source: "subscription",
      subscription,
      plan
    });

    expect(dbMocks.eq).toHaveBeenCalledWith("subscriptions.userId", "user-1");
    expect(dbMocks.eq).toHaveBeenCalledWith("subscriptions.status", "active");
    expect(dbMocks.gte).toHaveBeenCalledWith(
      "subscriptions.expiresAt",
      new Date("2026-07-17T15:00:00.000Z")
    );
    expect(query.limit).toHaveBeenCalledWith(1);
  });

  it("returns Free access when there is no active, unexpired subscription", async () => {
    mockSubscriptionQuery([]);

    await expect(resolveSubscriptionAccess({ id: "user-1" })).resolves.toEqual({
      state: "active",
      source: "free",
      subscription: null,
      plan: null
    });
  });

  it("returns unavailable instead of treating a database failure as inactive", async () => {
    const databaseError = new Error("database unavailable");
    mockSubscriptionQuery(databaseError);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(resolveSubscriptionAccess({ id: "user-1" })).resolves.toEqual({
      state: "unavailable",
      subscription: null,
      plan: null,
      error: databaseError
    });
    expect(consoleError).toHaveBeenCalledWith(
      "[subscription-access] resolution failed",
      { userId: "user-1", error: databaseError }
    );
  });
});

describe("getSubscriptionAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns inactive without querying the database for an unauthenticated request", async () => {
    const locals = {} as App.Locals;

    await expect(getSubscriptionAccess(locals)).resolves.toEqual({
      state: "inactive",
      subscription: null,
      plan: null
    });
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });

  it("shares one subscription lookup within the same request", async () => {
    mockSubscriptionQuery([]);
    const locals = { user: { id: "user-1" } } as App.Locals;

    const first = getSubscriptionAccess(locals);
    const second = getSubscriptionAccess(locals);

    expect(second).toBe(first);
    await expect(first).resolves.toMatchObject({ state: "active", source: "free" });
    expect(dbMocks.getDb).toHaveBeenCalledTimes(1);
  });
});
