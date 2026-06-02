import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = ({ locals }) => {
  const user = locals.user;
  if (!user) {
    throw redirect(303, "/login?redirect=/admin");
  }

  if (!(user as { isAdmin?: boolean }).isAdmin) {
    throw redirect(303, "/anuncios");
  }

  return {};
};
