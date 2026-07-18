import { redirect } from "@sveltejs/kit";
import { config } from "$lib/config";

export const load = async ({ params }) => {
  const shortId = params.shortId?.trim().toLowerCase();
  if (!shortId || !/^[a-z0-9]{4,12}$/.test(shortId)) {
    throw redirect(302, "/lista");
  }

  const response = await fetch(`${config.apiUrl}/api/short-links/${encodeURIComponent(shortId)}`);
  if (!response.ok) {
    throw redirect(302, "/lista");
  }

  const payload = (await response.json().catch(() => ({}))) as { redirectTo?: string };
  throw redirect(302, payload.redirectTo || "/lista");
};
