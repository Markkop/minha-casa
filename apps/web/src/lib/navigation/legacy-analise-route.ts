import { LIST_ROUTE } from "$lib/navigation/list-route";

export function buildLegacyAnaliseRedirectUrl(url: URL, print = false): string {
  const listingId = url.searchParams.get("listing")?.trim();
  if (!listingId) return LIST_ROUTE;

  const params = new URLSearchParams(url.searchParams);
  params.delete("listing");
  params.delete("collection");
  const query = params.toString();
  const suffix = print ? "/imagens/imprimir" : "";

  return `/imoveis/${encodeURIComponent(listingId)}${suffix}${query ? `?${query}` : ""}`;
}
