import { redirect } from "@sveltejs/kit";
import { isPlatformSuperAdmin } from "$lib/admin/platform-role";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = ({ locals }) => {
  const user = locals.user;
  if (!user) {
    throw redirect(303, "/login?redirect=/admin");
  }

  if (!isPlatformSuperAdmin(user)) {
    throw redirect(303, "/lista");
  }

  return { isSuperAdmin: true };
};
