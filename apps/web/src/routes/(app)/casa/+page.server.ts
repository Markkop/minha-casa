import { redirect } from "@sveltejs/kit";

export function load({ url }) {
  const query = url.searchParams.toString();
  throw redirect(307, query ? `/financiamento?${query}` : "/financiamento");
}
