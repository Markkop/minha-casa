import "$lib/server/load-env";
import { building } from "$app/environment";
import { redirect, type Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { getAuth } from "$lib/auth";
import { resolveActiveOrganizationId } from "$lib/server/organization-context";
import { isPublicRoute } from "$lib/routing/public-routes";
import {
  isSubscriptionValid,
  requiresSubscription,
  SUBSCRIPTION_COOKIE_NAME,
  SUBSCRIPTION_PAGE
} from "$lib/subscription";

const AUTH_BASE = "/auth/";
const AUTH_ROUTES = new Set(["/login", "/signup"]);
const SUBSCRIPTION_EXEMPT_PREFIXES = ["/subscribe", "/planos", "/admin"];

function isSubscriptionExempt(pathname: string) {
  return SUBSCRIPTION_EXEMPT_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

const authHandle: Handle = async ({ event, resolve }) => {
  if (building) return resolve(event);

  if (event.url.pathname.startsWith(AUTH_BASE)) {
    return getAuth().handler(event.request);
  }

  try {
    const session = await getAuth().api.getSession({ headers: event.request.headers });
    if (session) {
      event.locals.session = session.session;
      event.locals.user = session.user;
      event.locals.activeOrganizationId = await resolveActiveOrganizationId(
        event.cookies,
        session.user.id
      );
    } else {
      event.locals.session = undefined;
      event.locals.user = undefined;
      event.locals.activeOrganizationId = null;
    }
  } catch (error) {
    console.error("[hooks.server] getSession failed", error);
    event.locals.activeOrganizationId = null;
  }

  return resolve(event);
};

const routeGuardHandle: Handle = async ({ event, resolve }) => {
  const pathname = event.url.pathname;
  const publicRoute = isPublicRoute(pathname);
  const loggedIn = Boolean(event.locals.user);

  if (AUTH_ROUTES.has(pathname) && loggedIn) {
    throw redirect(303, "/anuncios");
  }

  if (!publicRoute && !loggedIn) {
    const login = new URL("/login", event.url);
    login.searchParams.set("redirect", pathname);
    throw redirect(303, login.toString());
  }

  if (loggedIn && requiresSubscription(pathname) && !isSubscriptionExempt(pathname)) {
    const cookie = event.cookies.get(SUBSCRIPTION_COOKIE_NAME);
    if (!isSubscriptionValid(cookie)) {
      const subscribe = new URL(SUBSCRIPTION_PAGE, event.url);
      subscribe.searchParams.set("redirect", pathname);
      throw redirect(303, subscribe.toString());
    }
  }

  return resolve(event);
};

export const handle = sequence(authHandle, routeGuardHandle);
