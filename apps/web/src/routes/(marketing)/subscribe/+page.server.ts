import { redirect } from "@sveltejs/kit";
import { subscriptionManagementRedirectFor } from "$lib/navigation/subscription-management-redirect";
import { getSubscriptionAccess } from "$lib/server/subscription-access";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, request, url }) => {
  const redirectPath = url.searchParams.get("redirect");
  if (!locals.user || !redirectPath) return {};

  const access = await getSubscriptionAccess(locals, request.headers);
  const destination = subscriptionManagementRedirectFor(
    access.state,
    redirectPath,
    `${url.pathname}${url.search}`
  );
  if (destination) {
    const target = new URL(destination.pathname, url);
    if (destination.redirect) target.searchParams.set("redirect", destination.redirect);
    throw redirect(303, target.toString());
  }

  return {};
};
