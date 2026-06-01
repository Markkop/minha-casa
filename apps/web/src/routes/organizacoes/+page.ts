import { error } from "@sveltejs/kit";
import { formatApiError } from "$lib/api/error-message";
import { ORGANIZATIONS_LOAD_KEY } from "$lib/organizacoes/helpers";
import { fetchWithBetterAuthJwt } from "$lib/api/authenticated-fetch";
import type { Organization } from "$lib/workspace/client";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch, parent, depends }) => {
  depends(ORGANIZATIONS_LOAD_KEY);

  const { activeOrganizationId } = await parent();

  try {
    const response = await fetchWithBetterAuthJwt(fetch, "/api/organizations");
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw error(response.status, formatApiError({ status: response.status, data }));
    }

    const { organizations } = (await response.json()) as { organizations: Organization[] };
    return {
      organizations,
      activeOrganizationId: activeOrganizationId ?? null,
      organizationsError: null as string | null
    };
  } catch (err) {
    if (err && typeof err === "object" && "status" in err) {
      throw err;
    }

    const message = err instanceof Error ? err.message : "Erro ao carregar organizacoes";
    return {
      organizations: [] as Organization[],
      activeOrganizationId: activeOrganizationId ?? null,
      organizationsError: message
    };
  }
};
