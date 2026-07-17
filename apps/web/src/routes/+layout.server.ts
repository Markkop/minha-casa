import { AUTH_INVALIDATION_KEY } from "$lib/auth/logout";

export const load = ({ locals, depends }) => {
  depends(AUTH_INVALIDATION_KEY);

  return {
    session: locals.session ?? null,
    user: locals.user ?? null,
    activeOrganizationId: locals.activeOrganizationId ?? null
  };
};
