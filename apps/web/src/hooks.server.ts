import "$lib/server/load-env";
import { building } from "$app/environment";
import { redirect, type Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { getAuth } from "$lib/auth";
import { resolveActiveOrganizationId } from "$lib/server/organization-context";
import { isPublicRoute } from "$lib/routing/public-routes";
import {
  requiresSubscription,
  SUBSCRIPTION_COOKIE_NAME,
  SUBSCRIPTION_UNAVAILABLE_PAGE
} from "$lib/subscription";
import { getSubscriptionAccess } from "$lib/server/subscription-access";
import { unauthenticatedApiResponse } from "$lib/server/unauthenticated-api-response";
import { isPublicPhoenixProxyRequest } from "$lib/server/api-proxy-auth";
import { safeRedirectPath } from "$lib/navigation/safe-redirect";
import { subscriptionRedirectFor } from "$lib/navigation/subscription-redirect";

const AUTH_BASE = "/api/auth";
const AUTH_ROUTES = new Set(["/login", "/signup"]);
const SUBSCRIPTION_EXEMPT_PREFIXES = [
  "/subscribe",
  "/planos",
  "/admin",
  SUBSCRIPTION_UNAVAILABLE_PAGE
];

function isSubscriptionExempt(pathname: string) {
  return SUBSCRIPTION_EXEMPT_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

const authHandle: Handle = async ({ event, resolve }) => {
  if (building) return resolve(event);

  // Remove the legacy, user-agnostic entitlement cache. Access is resolved per session below.
  if (event.cookies.get(SUBSCRIPTION_COOKIE_NAME)) {
    event.cookies.delete(SUBSCRIPTION_COOKIE_NAME, { path: "/" });
  }

  if (event.url.pathname === AUTH_BASE || event.url.pathname.startsWith(`${AUTH_BASE}/`)) {
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
    event.locals.session = undefined;
    event.locals.user = undefined;
    event.locals.activeOrganizationId = null;
  }

  return resolve(event);
};

const routeGuardHandle: Handle = async ({ event, resolve }) => {
  const pathname = event.url.pathname;
  const publicRoute =
    isPublicRoute(pathname) ||
    isPublicPhoenixProxyRequest(pathname, event.request.method);
  const loggedIn = Boolean(event.locals.user);
  const requestedPath = `${pathname}${event.url.search}`;

  if (AUTH_ROUTES.has(pathname) && loggedIn) {
    throw redirect(
      303,
      safeRedirectPath(event.url.searchParams.get("redirect"), "/anuncios")
    );
  }

  if (!publicRoute && !loggedIn) {
    const apiResponse = unauthenticatedApiResponse(pathname);
    if (apiResponse) return apiResponse;

    const login = new URL("/login", event.url);
    login.searchParams.set("redirect", requestedPath);
    throw redirect(303, login.toString());
  }

  if (loggedIn && requiresSubscription(pathname) && !isSubscriptionExempt(pathname)) {
    const access = await getSubscriptionAccess(event.locals);
    const destination = subscriptionRedirectFor(access.state, requestedPath);
    if (destination) {
      const target = new URL(destination.pathname, event.url);
      target.searchParams.set("redirect", destination.redirect);
      throw redirect(303, target.toString());
    }
  }

  return resolve(event);
};

export const handle = sequence(authHandle, routeGuardHandle);
