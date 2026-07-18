import { redirect } from "@sveltejs/kit";
import { buildListRedirectUrl } from "$lib/navigation/list-route";

export const load = ({ url }) => {
  throw redirect(308, buildListRedirectUrl(url));
};
