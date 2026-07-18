import { goto, invalidate } from "$app/navigation";
import { setActiveOrganizationIdCache } from "$lib/active-organization";
import { setActiveWorkspaceId, setActiveWorkspaceUserId } from "$lib/active-workspace";
import { signOut } from "$lib/auth-client";

const AUTH_INVALIDATION_KEY = "minha-casa:auth";

/** Sign out and land on marketing home with fresh layout session data. */
export async function logoutToHome() {
  const result = await signOut();
  if (result.error) {
    console.warn("[logout] signOut failed", result.error);
  }

  setActiveOrganizationIdCache(null);
  setActiveWorkspaceId(null);
  setActiveWorkspaceUserId(null);
  await goto("/", { replaceState: true });
  await invalidate(AUTH_INVALIDATION_KEY);
}

export { AUTH_INVALIDATION_KEY };
