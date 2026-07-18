import { fetchPhoenixApi } from "$lib/server/phoenix-api";

export type SubscriptionRecord = {
  id: string;
  userId: string;
  planId: string;
  status: string;
  expiresAt: string;
  [key: string]: unknown;
};

export type SubscriptionPlanRecord = {
  id: string;
  name: string;
  slug: string;
  [key: string]: unknown;
};

export type SubscriptionAccess =
  | {
      state: "active";
      source: "subscription";
      subscription: SubscriptionRecord;
      plan: SubscriptionPlanRecord;
    }
  | {
      state: "active";
      source: "free";
      subscription: null;
      plan: null;
    }
  | {
      state: "inactive";
      subscription: null;
      plan: null;
    }
  | {
      state: "unavailable";
      subscription: null;
      plan: null;
      error: unknown;
    };

type AccessUser = { id: string; isAdmin?: boolean | null };

type SubscriptionResponse = {
  accessStatus?: unknown;
  hasActiveSubscription?: unknown;
  subscription?: unknown;
  plan?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Resolve route entitlement through Phoenix, the canonical owner of subscription data. */
export async function resolveSubscriptionAccess(
  user: AccessUser,
  headers: Headers
): Promise<SubscriptionAccess> {
  try {
    const response = await fetchPhoenixApi("/subscriptions", { headers });
    if (!response.ok) {
      throw new Error(`Phoenix returned ${response.status}`);
    }

    const payload = (await response.json()) as SubscriptionResponse;
    if (
      payload.hasActiveSubscription === false &&
      payload.subscription == null &&
      payload.plan == null
    ) {
      return { state: "active", source: "free", subscription: null, plan: null };
    }

    if (
      payload.accessStatus !== "active" ||
      payload.hasActiveSubscription !== true ||
      !isRecord(payload.subscription) ||
      !isRecord(payload.plan)
    ) {
      throw new Error("Phoenix returned an invalid subscription response");
    }

    return {
      state: "active",
      source: "subscription",
      subscription: payload.subscription as SubscriptionRecord,
      plan: payload.plan as SubscriptionPlanRecord
    };
  } catch (error) {
    console.error("[subscription-access] resolution failed", { userId: user.id, error });
    return { state: "unavailable", subscription: null, plan: null, error };
  }
}

/** Share one entitlement lookup across hooks and server loads for the same request. */
export function getSubscriptionAccess(
  locals: App.Locals,
  headers: Headers
): Promise<SubscriptionAccess> {
  if (!locals.user) {
    return Promise.resolve({ state: "inactive", subscription: null, plan: null });
  }

  locals.subscriptionAccess ??= resolveSubscriptionAccess(locals.user, headers);
  return locals.subscriptionAccess;
}
