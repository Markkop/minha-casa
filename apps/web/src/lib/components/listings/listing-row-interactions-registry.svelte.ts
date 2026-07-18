import type { ListingFeatureOption } from "$lib/listings/listing-features";
import type { Property } from "$lib/listings/types";
import {
  createListingRowInteractions,
  type CreateListingRowInteractionsOptions
} from "$lib/components/listings/listing-row-interactions.svelte";

type RowInteractions = ReturnType<typeof createListingRowInteractions>;

export interface ListingRowInteractionsRegistryOptions {
  getListingById: (listingId: string) => Property | undefined;
  getFeatureCatalog: () => ListingFeatureOption[];
  updateListing: CreateListingRowInteractionsOptions["updateListing"];
  removeListing: CreateListingRowInteractionsOptions["removeListing"];
}

export function createListingRowInteractionsRegistry(
  options: ListingRowInteractionsRegistryOptions
) {
  const cache = new Map<string, RowInteractions>();

  function getForListing(property: Property): RowInteractions {
    const existing = cache.get(property.id);
    if (existing) return existing;

    const interactions = createListingRowInteractions({
      getImovel: () => options.getListingById(property.id) ?? property,
      getFeatureCatalog: options.getFeatureCatalog,
      updateListing: options.updateListing,
      removeListing: options.removeListing
    });

    cache.set(property.id, interactions);
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
