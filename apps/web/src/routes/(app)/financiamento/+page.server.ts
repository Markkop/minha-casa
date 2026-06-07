import { redirect } from "@sveltejs/kit";
import { buildFinanceiroRedirectUrl } from "$lib/navigation/financeiro-route";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ url }) => {
  throw redirect(307, buildFinanceiroRedirectUrl(url));
};
