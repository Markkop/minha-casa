import { api } from "$lib/api/client";
import type { AdminPlan, AdminSubscription } from "$lib/admin/client";

export interface CurrentSubscriptionResponse {
  subscription: AdminSubscription | null;
  plan: AdminPlan | null;
}

export const billingApi = {
  fetchPlans: () => api.get<{ plans: AdminPlan[]; stripeTestMode: boolean }>("/plans", { auth: false }),
  fetchCurrentSubscription: () => api.get<CurrentSubscriptionResponse>("/subscriptions"),
  createCheckoutSession: (input: { planId: string; couponId?: string; successUrl?: string; cancelUrl?: string }) =>
    api.post<{ checkoutUrl: string; sessionId: string }>("/checkout/session", input),
  openBillingPortal: () => api.post<{ url: string }>("/billing/portal", {})
};
