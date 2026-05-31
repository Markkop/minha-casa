import type { Session, User } from "$lib/auth";

declare global {
  namespace App {
    interface Locals {
      session?: Session["session"];
      user?: User;
    }

    interface PageData {
      session?: Session["session"] | null;
      user?: User | null;
    }
  }
}

export {};
