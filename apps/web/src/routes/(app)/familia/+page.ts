import { loadOrganizationManagement, ORGANIZATIONS_LOAD_KEY } from "$lib/organizacoes/load-management";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch, parent, depends }) => {
  depends(ORGANIZATIONS_LOAD_KEY);
  const { activeOrganizationId } = await parent();
  return loadOrganizationManagement(fetch, activeOrganizationId ?? null, "family");
};
