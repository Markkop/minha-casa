import { error } from "@sveltejs/kit";
import { fetchWithBetterAuthJwt } from "$lib/api/authenticated-fetch";
import { formatApiError } from "$lib/api/error-message";
import type { Organization } from "$lib/workspace/client";
import { ORGANIZATIONS_LOAD_KEY } from "./helpers";

export type ManagedOrganizationKind = "family" | "agency";

export async function loadOrganizationManagement(
  fetcher: typeof fetch,
  activeOrganizationId: string | null,
  kind: ManagedOrganizationKind
) {
  try {
    const response = await fetchWithBetterAuthJwt(fetcher, "/api/organizations");
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw error(response.status, formatApiError({ status: response.status, data }));
    }

    const { organizations } = (await response.json()) as { organizations: Organization[] };
    return {
      organizations: organizations.filter((organization) => organization.kind === kind),
      activeOrganizationId,
      organizationsError: null as string | null
    };
  } catch (err) {
    if (err && typeof err === "object" && "status" in err) throw err;

    return {
      organizations: [] as Organization[],
      activeOrganizationId,
      organizationsError: formatApiError(err, { action: "carregar imobiliárias" })
    };
  }
}

export { ORGANIZATIONS_LOAD_KEY };
