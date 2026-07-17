import { api } from "$lib/api/client";
import type { AdminPlan, AdminSubscription } from "$lib/admin/client";
import { parseApiResponse } from "$lib/api/parse-api-response";
import { subscriptionPayloadSchema } from "$lib/api/schemas/subscription";

export interface CurrentSubscriptionResponse {
  accessStatus: "active" | "inactive";
  hasActiveSubscription: boolean;
  subscription: AdminSubscription | null;
  plan: AdminPlan | null;
}

export const billingApi = {
  fetchPlans: () => api.get<{ plans: AdminPlan[]; stripeTestMode: boolean }>("/plans", { auth: false }),
  fetchCurrentSubscription: async () => {
    const payload = await api.get<unknown>("/subscriptions", { auth: false });
    return parseApiResponse(
      subscriptionPayloadSchema,
      payload,
      "/api/subscriptions"
    ) as CurrentSubscriptionResponse;
  },
  createCheckoutSession: (input: { planId: string; couponId?: string; successUrl?: string; cancelUrl?: string }) =>
    api.post<{ checkoutUrl: string; sessionId: string }>("/checkout/session", input),
  openBillingPortal: () => api.post<{ url: string }>("/billing/portal", {})
};
