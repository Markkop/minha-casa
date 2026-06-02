import type { Imovel } from "$lib/anuncios/types";

export function mergeListingDraft(listing: Imovel, formData: Partial<Imovel>): Imovel {
  return { ...listing, ...formData };
}
