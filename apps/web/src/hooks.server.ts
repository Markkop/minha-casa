import { building } from "$app/environment";
import { redirect, type Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { auth } from "$lib/auth";
import {
  isSubscriptionValid,
  requiresSubscription,
  SUBSCRIPTION_COOKIE_NAME,
  SUBSCRIPTION_PAGE
} from "$lib/subscription";

const AUTH_BASE = "/auth/";
const PUBLIC_ROUTES = new Set([
  "/",
  "/login",
  "/signup",
  "/privacy",
  "/terms",
  "/data-deletion",
  "/conectar-whatsapp",
  "/conectar-telegram"
]);
const AUTH_ROUTES = new Set(["/login", "/signup"]);
const SUBSCRIPTION_EXEMPT_PREFIXES = ["/subscribe", "/planos", "/admin"];

function isPublicShortLink(pathname: string) {
  return /^\/s\/[a-z0-9]{4,12}$/i.test(pathname);
}

function isPublicShare(pathname: string) {
  return pathname.startsWith("/share/");
}

function isSubscriptionExempt(pathname: string) {
  return SUBSCRIPTION_EXEMPT_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

const authHandle: Handle = async ({ event, resolve }) => {
  if (building) return resolve(event);

  if (event.url.pathname.startsWith(AUTH_BASE)) {
    return auth.handler(event.request);
  }

  try {
    const session = await auth.api.getSession({ headers: event.request.headers });
    if (session) {
      event.locals.session = session.session;
      event.locals.user = session.user;
    }
  } catch (error) {
    console.error("[hooks.server] getSession failed", error);
  }

  return resolve(event);
};

const routeGuardHandle: Handle = async ({ event, resolve }) => {
  const pathname = event.url.pathname;
  const publicRoute = PUBLIC_ROUTES.has(pathname) || isPublicShortLink(pathname) || isPublicShare(pathname);
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
