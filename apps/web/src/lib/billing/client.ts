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

export interface CheckoutInput {
  planId: string;
  couponId?: string;
  organizationId?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export const billingApi = {
  fetchPlans: () => api.get<{ plans: AdminPlan[]; stripeTestMode: boolean }>("/plans", { auth: false }),
  fetchCurrentSubscription: async () => {
    const payload = await api.get<unknown>("/subscriptions");
    return parseApiResponse(
      subscriptionPayloadSchema,
      payload,
      "/api/subscriptions"
    ) as CurrentSubscriptionResponse;
  },
  createCheckoutSession: (input: CheckoutInput) =>
    api.post<{ checkoutUrl: string; sessionId: string }>("/checkout/session", input),
  openBillingPortal: () => api.post<{ url: string }>("/billing/portal", {})
};
