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

export interface SeatSummary {
  organizationId: string;
  usedSeats: number;
  pendingInvites: number;
  licensedSeats: number;
  includedSeats: number;
  additionalSeatPriceInCents: number;
  pendingLicensedSeats: number | null;
  pendingSeatsEffectiveAt: string | null;
  currentPeriodEnd: string | null;
  canManageBilling: boolean;
  subscriptionStatus?: string | null;
  monthlyTotalInCents?: number | null;
  currency?: string;
}

export interface SeatChangePreview {
  totalSeats: number;
  additionalSeats: number;
  amountDueNow: number;
  nextInvoiceAmount: number;
  monthlyTotalInCents?: number;
  currency?: string;
  quoteToken: string;
  effectiveAt: string | null;
  change: "increase" | "decrease" | "unchanged";
}

export interface SeatCheckoutInput {
  planId: string;
  couponId?: string;
  organizationId?: string;
  totalSeats?: number;
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
  createCheckoutSession: (input: SeatCheckoutInput) =>
    api.post<{ checkoutUrl: string; sessionId: string }>("/checkout/session", input),
  openBillingPortal: () => api.post<{ url: string }>("/billing/portal", {}),
  fetchSeatSummary: (organizationId: string) =>
    api.get<{ seats: SeatSummary }>(`/organizations/${organizationId}/billing/seats`),
  previewSeatChange: (organizationId: string, totalSeats: number) =>
    api.post<{ preview: SeatChangePreview }>(
      `/organizations/${organizationId}/billing/seats/preview`,
      { totalSeats }
    ),
  updateSeats: (organizationId: string, input: { totalSeats: number; quoteToken: string }) =>
    api.put<{ seats: SeatSummary }>(`/organizations/${organizationId}/billing/seats`, input)
};
