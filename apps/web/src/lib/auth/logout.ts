import { goto, invalidate } from "$app/navigation";
import { setActiveOrganizationIdCache } from "$lib/active-organization";
import { signOut } from "$lib/auth-client";

const AUTH_INVALIDATION_KEY = "minha-casa:auth";

/** Sign out and land on marketing home with fresh layout session data. */
export async function logoutToHome() {
  const result = await signOut();
  if (result.error) {
    console.warn("[logout] signOut failed", result.error);
  }

  setActiveOrganizationIdCache(null);
  await goto("/", { replaceState: true });
  await invalidate(AUTH_INVALIDATION_KEY);
}

export { AUTH_INVALIDATION_KEY };
