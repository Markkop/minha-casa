import { describe, expect, it } from "vitest";
import { subscriptionPayloadSchema } from "./subscription";

const activeSubscription = {
  id: "subscription-1",
  userId: "user-1",
  planId: "plan-pro",
  status: "active",
  expiresAt: "2026-08-01T12:00:00.000Z"
};

const proPlan = {
  id: "plan-pro",
  slug: "pro",
  name: "Pro",
  isActive: true
};

describe("subscriptionPayloadSchema", () => {
  it("accepts an active access response with its subscription and plan", () => {
    const result = subscriptionPayloadSchema.parse({
      accessStatus: "active",
      hasActiveSubscription: true,
      subscription: activeSubscription,
      plan: proPlan
    });

    expect(result).toMatchObject({
      accessStatus: "active",
      hasActiveSubscription: true,
      subscription: activeSubscription,
      plan: proPlan
    });
  });

  it("accepts an inactive access response without a subscription", () => {
    expect(
      subscriptionPayloadSchema.parse({
        accessStatus: "inactive",
        hasActiveSubscription: false,
        subscription: null,
        plan: null
      })
    ).toEqual({
      accessStatus: "inactive",
      hasActiveSubscription: false,
      subscription: null,
      plan: null
    });
  });

  it("requires the explicit access status fields", () => {
    const result = subscriptionPayloadSchema.safeParse({
      subscription: activeSubscription,
      plan: proPlan
    });

    expect(result.success).toBe(false);
  });

  it("rejects access statuses that are not part of the public API", () => {
    const result = subscriptionPayloadSchema.safeParse({
      accessStatus: "unavailable",
      hasActiveSubscription: false,
      subscription: null,
      plan: null
    });

    expect(result.success).toBe(false);
  });
});
