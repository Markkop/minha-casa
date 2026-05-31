export interface SubscriptionPlanLimits {
  collectionsLimit: number | null;
  listingsPerCollection: number | null;
  aiParsesPerMonth: number | null;
  canShare: boolean;
  canCreateOrg: boolean;
}

export interface SubscriptionSyncPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceInCents: number;
  isActive: boolean;
  stripePriceId: string | null;
  limits: SubscriptionPlanLimits;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionSyncSubscription {
  id: string;
  userId: string;
  planId: string;
  status: "active" | "expired" | "cancelled";
  startsAt: string;
  expiresAt: string;
  grantedBy: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  stripeSubscriptionId?: string | null;
  cancelAtPeriodEnd?: boolean | null;
}

export interface SubscriptionSyncResult {
  hasActiveSubscription: boolean;
  subscription: SubscriptionSyncSubscription | null;
  plan: SubscriptionSyncPlan | null;
}

interface SubscriptionsApiResponse {
  subscription?: SubscriptionSyncSubscription | null;
  plan?: SubscriptionSyncPlan | null;
}

/** Refresh the httpOnly subscription-status cookie via the SvelteKit BFF route. */
export async function syncSubscriptionCookie(): Promise<SubscriptionSyncResult> {
  try {
    const res = await fetch("/api/subscriptions", { credentials: "include" });
    if (!res.ok) {
      return { hasActiveSubscription: false, subscription: null, plan: null };
    }
    const data = (await res.json()) as SubscriptionsApiResponse;
    const hasActiveSubscription = data.subscription?.status === "active";
    return {
      hasActiveSubscription,
      subscription: data.subscription ?? null,
      plan: data.plan ?? null
    };
  } catch {
    return { hasActiveSubscription: false, subscription: null, plan: null };
  }
}

export function isSafeRedirectPath(path: string | null): path is string {
  if (!path) return false;
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  if (path.includes("://")) return false;
  return true;
}
