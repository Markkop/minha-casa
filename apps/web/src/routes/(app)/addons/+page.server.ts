import { redirect } from "@sveltejs/kit";
import { buildLegacyToolsRedirectUrl } from "$lib/navigation/legacy-tools-route";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ url }) => {
  throw redirect(308, buildLegacyToolsRedirectUrl(url));
};
