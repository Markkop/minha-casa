import { formatApiError } from "$lib/api/error-message";
import type { OrganizationInvitePreview } from "$lib/workspace/client";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch, params, parent }) => {
  const { user } = await parent();
  const token = params.token;

  try {
    const response = await fetch(`/api/organization-invites/${encodeURIComponent(token)}`);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        token,
        user,
        invite: null as OrganizationInvitePreview | null,
        inviteError: formatApiError({ status: response.status, data })
      };
    }

    return {
      token,
      user,
      invite: (data as { invite: OrganizationInvitePreview }).invite,
      inviteError: null as string | null
    };
  } catch (error) {
    return {
      token,
      user,
      invite: null as OrganizationInvitePreview | null,
      inviteError: error instanceof Error ? error.message : "Erro ao carregar convite"
    };
  }
};
