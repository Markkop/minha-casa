import { and, desc, eq, getDb, gte, plans, subscriptions } from "@minha-casa/db";

export type SubscriptionRecord = typeof subscriptions.$inferSelect;
export type SubscriptionPlanRecord = typeof plans.$inferSelect;

export type SubscriptionAccess =
  | {
      state: "active";
      source: "subscription";
      subscription: SubscriptionRecord;
      plan: SubscriptionPlanRecord;
    }
  | {
      state: "active";
      source: "admin";
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

type AccessUser = {
  id: string;
  isAdmin?: boolean | null;
};

/** Resolve route entitlement from the database; persisted status alone is never sufficient. */
export async function resolveSubscriptionAccess(user: AccessUser): Promise<SubscriptionAccess> {
  if (user.isAdmin) {
    return { state: "active", source: "admin", subscription: null, plan: null };
  }

  try {
    const now = new Date();
    const rows = await getDb()
      .select({ subscription: subscriptions, plan: plans })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(
        and(
          eq(subscriptions.userId, user.id),
          eq(subscriptions.status, "active"),
          gte(subscriptions.expiresAt, now)
        )
      )
      .orderBy(desc(subscriptions.expiresAt))
      .limit(1);

    if (rows.length === 0) {
      return { state: "inactive", subscription: null, plan: null };
    }

    return {
      state: "active",
      source: "subscription",
      subscription: rows[0].subscription,
      plan: rows[0].plan
    };
  } catch (error) {
    console.error("[subscription-access] resolution failed", { userId: user.id, error });
    return { state: "unavailable", subscription: null, plan: null, error };
  }
}

/** Share one entitlement lookup across hooks and server loads for the same request. */
export function getSubscriptionAccess(locals: App.Locals): Promise<SubscriptionAccess> {
  if (!locals.user) {
    return Promise.resolve({ state: "inactive", subscription: null, plan: null });
  }

  locals.subscriptionAccess ??= resolveSubscriptionAccess(locals.user);
  return locals.subscriptionAccess;
}
