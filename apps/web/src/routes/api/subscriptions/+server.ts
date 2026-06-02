import "$lib/server/load-env";
import { json } from "@sveltejs/kit";
import { and, eq, getDb, plans, subscriptions, users } from "@minha-casa/db";
import { getAuth } from "$lib/auth";
import { SUBSCRIPTION_ACTIVE } from "$lib/subscription";
import {
  refreshSubscriptionStatusCookie,
  setSubscriptionStatusCookie
} from "$lib/server/subscription-status";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request, cookies }) => {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await refreshSubscriptionStatusCookie(cookies, session.user.id);
    return json({ subscription: result.subscription, plan: result.plan });
  } catch (error) {
    console.error("[api/subscriptions] GET failed", error);
    return json({ error: "Failed to fetch subscription" }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request, cookies }) => {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(session.user as { isAdmin?: boolean }).isAdmin) {
    return json({ error: "Only admins can create subscriptions" }, { status: 403 });
  }

  let body: { userId?: string; planId?: string; expiresAt?: string; notes?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { userId, planId, expiresAt, notes } = body;
  if (!userId || !planId || !expiresAt) {
    return json({ error: "userId, planId, and expiresAt are required" }, { status: 400 });
  }

  try {
    const db = getDb();

    const [targetUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!targetUser) {
      return json({ error: "User not found" }, { status: 404 });
    }

    const [targetPlan] = await db.select().from(plans).where(eq(plans.id, planId)).limit(1);
    if (!targetPlan) {
      return json({ error: "Plan not found" }, { status: 404 });
    }
    if (!targetPlan.isActive) {
      return json({ error: "Cannot create subscription for inactive plan" }, { status: 400 });
    }

    await db
      .update(subscriptions)
      .set({ status: "expired" })
      .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")));

    const subscriptionExpiresAt = new Date(expiresAt);
    const [newSubscription] = await db
      .insert(subscriptions)
      .values({
        userId,
        planId,
        status: "active",
        expiresAt: subscriptionExpiresAt,
        grantedBy: session.user.id,
        notes: notes ?? null
      })
      .returning();

    if (userId === session.user.id) {
      setSubscriptionStatusCookie(cookies, SUBSCRIPTION_ACTIVE, subscriptionExpiresAt);
    }

    return json({ subscription: newSubscription }, { status: 201 });
  } catch (error) {
    console.error("[api/subscriptions] POST failed", error);
    return json({ error: "Failed to create subscription" }, { status: 500 });
  }
};
