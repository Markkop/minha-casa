import "$lib/server/load-env";
import { json } from "@sveltejs/kit";
import { and, desc, eq, getDb, plans, subscriptions, users } from "@minha-casa/db";
import { getAuth } from "$lib/auth";
import {
  SUBSCRIPTION_COOKIE_NAME,
  SUBSCRIPTION_ACTIVE,
  SUBSCRIPTION_INACTIVE,
  createSubscriptionCookieValue
} from "$lib/subscription";
import type { RequestHandler } from "./$types";

const COOKIE_MAX_AGE = 60 * 60;

export const GET: RequestHandler = async ({ request, cookies }) => {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
    const rows = await db
      .select({
        subscription: subscriptions,
        plan: plans
      })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(and(eq(subscriptions.userId, session.user.id), eq(subscriptions.status, "active")))
      .orderBy(desc(subscriptions.expiresAt))
      .limit(1);

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: COOKIE_MAX_AGE
    };

    if (rows.length === 0) {
      const pastDate = new Date(Date.now() - 86_400_000);
      cookies.set(
        SUBSCRIPTION_COOKIE_NAME,
        createSubscriptionCookieValue(SUBSCRIPTION_INACTIVE, pastDate),
        cookieOptions
      );
      return json({ subscription: null, plan: null });
    }

    const { subscription, plan } = rows[0];
    const expiresAt = new Date(subscription.expiresAt);
    const isExpired = expiresAt < new Date();
    const cookieValue = isExpired
      ? createSubscriptionCookieValue(SUBSCRIPTION_INACTIVE, expiresAt)
      : createSubscriptionCookieValue(SUBSCRIPTION_ACTIVE, expiresAt);

    cookies.set(SUBSCRIPTION_COOKIE_NAME, cookieValue, cookieOptions);
    return json({ subscription, plan });
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

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: COOKIE_MAX_AGE
    };

    if (userId === session.user.id) {
      cookies.set(
        SUBSCRIPTION_COOKIE_NAME,
        createSubscriptionCookieValue(SUBSCRIPTION_ACTIVE, subscriptionExpiresAt),
        cookieOptions
      );
    }

    return json({ subscription: newSubscription }, { status: 201 });
  } catch (error) {
    console.error("[api/subscriptions] POST failed", error);
    return json({ error: "Failed to create subscription" }, { status: 500 });
  }
};
