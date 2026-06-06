export function buildListingAnaliseHref(
  listingId: string,
  collectionId?: string | null,
  extraParams?: Record<string, string>
): string {
  const params = new URLSearchParams();

  if (collectionId) {
    params.set("collection", collectionId);
  }

  params.set("listing", listingId);

  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      if (value) params.set(key, value);
    }
  }

  return `/analise?${params.toString()}`;
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

  return `/financiamento?${params.toString()}`;
}

export function buildListingImagesPrintHref(
  listingId: string,
  collectionId?: string | null
): string {
  const params = new URLSearchParams();

  if (collectionId) {
    params.set("collection", collectionId);
  }

  params.set("listing", listingId);

  return `/analise/imagens/imprimir?${params.toString()}`;
}
