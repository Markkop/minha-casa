import { isSafeRedirectPath } from "$lib/navigation/safe-redirect";
import { SUBSCRIPTION_UNAVAILABLE_PAGE } from "$lib/subscription";
import type { GuardedSubscriptionState } from "$lib/navigation/subscription-redirect";

export function subscriptionManagementRedirectFor(
  state: GuardedSubscriptionState,
  redirectPath: string | null,
  currentPath: string
): { pathname: string; redirect?: string } | null {
  if (!isSafeRedirectPath(redirectPath)) return null;
  if (state === "active") return { pathname: redirectPath };
  if (state === "inactive") return null;

  return {
    pathname: SUBSCRIPTION_UNAVAILABLE_PAGE,
    redirect: currentPath
  };
}
