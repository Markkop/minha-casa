import type { Imovel } from "$lib/anuncios/types";
import {
  createListingRowInteractions,
  type CreateListingRowInteractionsOptions
} from "$lib/components/anuncios/listing-row-interactions.svelte";

type RowInteractions = ReturnType<typeof createListingRowInteractions>;

export interface ListingRowInteractionsRegistryOptions {
  updateListing: CreateListingRowInteractionsOptions["updateListing"];
  removeListing: CreateListingRowInteractionsOptions["removeListing"];
}

export function createListingRowInteractionsRegistry(
  options: ListingRowInteractionsRegistryOptions
) {
  const cache = new Map<string, RowInteractions>();

  function getForListing(imovel: Imovel): RowInteractions {
    const existing = cache.get(imovel.id);
    if (existing) return existing;

    const interactions = createListingRowInteractions({
      getImovel: () => imovel,
      updateListing: options.updateListing,
      removeListing: options.removeListing
    });

    cache.set(imovel.id, interactions);
    return interactions;
  }

  function prune(activeListingIds: Set<string>) {
    for (const listingId of cache.keys()) {
      if (!activeListingIds.has(listingId)) {
        cache.delete(listingId);
      }
    }
  }

  return { getForListing, prune };
}
