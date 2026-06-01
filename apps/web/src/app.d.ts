import type { Session, User } from "$lib/auth";

declare global {
  namespace App {
    interface Locals {
      session?: Session["session"];
      user?: User;
      activeOrganizationId?: string | null;
    }

    interface PageData {
      session?: Session["session"] | null;
      user?: User | null;
      activeOrganizationId?: string | null;
    }
  }
}

export {};
