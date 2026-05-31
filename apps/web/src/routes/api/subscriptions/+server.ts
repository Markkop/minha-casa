import "$lib/server/load-env";
import { json } from "@sveltejs/kit";
import { and, desc, eq, getDb, plans, subscriptions } from "@minha-casa/db";
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
