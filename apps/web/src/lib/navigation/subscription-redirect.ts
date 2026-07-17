import {
  SUBSCRIPTION_PAGE,
  SUBSCRIPTION_UNAVAILABLE_PAGE
} from "$lib/subscription";

export type GuardedSubscriptionState = "active" | "inactive" | "unavailable";

export function subscriptionRedirectFor(
  state: GuardedSubscriptionState,
  requestedPath: string
): { pathname: string; redirect: string } | null {
  if (state === "active") return null;

  return {
    pathname: state === "inactive" ? SUBSCRIPTION_PAGE : SUBSCRIPTION_UNAVAILABLE_PAGE,
    redirect: requestedPath
  };
}
