import type { Cookies } from "@sveltejs/kit";
import { and, desc, eq, getDb, plans, subscriptions } from "@minha-casa/db";
import {
  createSubscriptionCookieValue,
  SUBSCRIPTION_ACTIVE,
  SUBSCRIPTION_COOKIE_NAME,
  SUBSCRIPTION_INACTIVE
} from "$lib/subscription";

export const SUBSCRIPTION_COOKIE_MAX_AGE = 60 * 60;

const SUBSCRIPTION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SUBSCRIPTION_COOKIE_MAX_AGE
};

export function setSubscriptionStatusCookie(
  cookies: Cookies,
  status: typeof SUBSCRIPTION_ACTIVE | typeof SUBSCRIPTION_INACTIVE,
  expiresAt: Date
) {
  cookies.set(
    SUBSCRIPTION_COOKIE_NAME,
    createSubscriptionCookieValue(status, expiresAt),
    SUBSCRIPTION_COOKIE_OPTIONS
  );
}

export async function refreshSubscriptionStatusCookie(cookies: Cookies, userId: string) {
  const db = getDb();
  const rows = await db
    .select({
      subscription: subscriptions,
      plan: plans
    })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")))
    .orderBy(desc(subscriptions.expiresAt))
    .limit(1);

  if (rows.length === 0) {
    const pastDate = new Date(Date.now() - 86_400_000);
    setSubscriptionStatusCookie(cookies, SUBSCRIPTION_INACTIVE, pastDate);
    return { hasActiveSubscription: false, subscription: null, plan: null };
  }

  const { subscription, plan } = rows[0];
  const expiresAt = new Date(subscription.expiresAt);
  const hasActiveSubscription = expiresAt >= new Date();
  setSubscriptionStatusCookie(
    cookies,
    hasActiveSubscription ? SUBSCRIPTION_ACTIVE : SUBSCRIPTION_INACTIVE,
    expiresAt
  );

  return { hasActiveSubscription, subscription, plan };
}
