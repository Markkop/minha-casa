/// <reference path="./lib/google-maps.d.ts" />
import type { Session, User } from "$lib/auth";
import type { SubscriptionAccess } from "$lib/server/subscription-access";

type AppUser = User & { isAdmin?: boolean | null };

declare global {
  namespace App {
    interface Locals {
      session?: Session["session"];
      user?: AppUser;
      activeOrganizationId?: string | null;
      subscriptionAccess?: Promise<SubscriptionAccess>;
    }

    interface PageData {
      session?: Session["session"] | null;
      user?: AppUser | null;
      activeOrganizationId?: string | null;
    }
  }
}

export {};
