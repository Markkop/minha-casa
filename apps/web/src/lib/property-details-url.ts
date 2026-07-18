export function buildPropertyHref(
  listingId: string,
  extraParams?: Record<string, string>
): string {
  const params = new URLSearchParams();

  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      if (value) params.set(key, value);
    }
  }

  const query = params.toString();
  return `/imoveis/${encodeURIComponent(listingId)}${query ? `?${query}` : ""}`;
}

export function buildListingFinanciamentoHref(
  listingId: string,
  collectionId?: string | null
): string {
  const params = new URLSearchParams();

  if (collectionId) {
    params.set("collection", collectionId);
  }

  params.set("listing", listingId);

  return `/financeiro?${params.toString()}`;
}

export function buildListingImagesPrintHref(
  listingId: string
): string {
  return `/imoveis/${encodeURIComponent(listingId)}/imagens/imprimir`;
}
