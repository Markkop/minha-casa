import { AUTH_INVALIDATION_KEY } from "$lib/auth/logout";
import { SUBSCRIPTION_COOKIE_NAME, isSubscriptionValid } from "$lib/subscription";

export const load = ({ locals, cookies, depends }) => {
  depends(AUTH_INVALIDATION_KEY);

  return {
    session: locals.session ?? null,
    user: locals.user ?? null,
    activeOrganizationId: locals.activeOrganizationId ?? null,
    subscriptionActive: isSubscriptionValid(cookies.get(SUBSCRIPTION_COOKIE_NAME))
  };
};
