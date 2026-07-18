import { redirect } from "@sveltejs/kit";
import { buildLegacyAnaliseRedirectUrl } from "$lib/navigation/legacy-analise-route";

export const load = ({ url }) => {
  throw redirect(308, buildLegacyAnaliseRedirectUrl(url));
};
