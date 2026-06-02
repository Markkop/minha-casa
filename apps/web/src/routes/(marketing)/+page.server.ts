import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, parent }) => {
  const { subscriptionActive } = await parent();

  if (locals.user && subscriptionActive) {
    throw redirect(303, "/anuncios");
  }
};
