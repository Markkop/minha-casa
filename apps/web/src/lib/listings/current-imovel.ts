import type { Property } from "$lib/listings/types";
import { sortSelectableListings } from "$lib/listings/listing-selector";
import { readStoredWorkspaceListingId } from "$lib/workspace-listing-storage";

export function getCurrentImovelId(input: {
  pathname: string;
  params: { id?: string };
  searchParams: URLSearchParams;
  listings: Property[];
  collectionId?: string | null;
}): string | null {
  const isImovelRoute = input.pathname.startsWith("/imoveis/");
  const urlSelectedId = isImovelRoute
    ? (input.params.id ?? null)
    : input.searchParams.get("listing");
  const storedSelectedId = input.collectionId
    ? readStoredWorkspaceListingId(input.collectionId, input.listings)
    : null;

  const sortedListings = sortSelectableListings(input.listings);
  const selected =
    sortedListings.find((listing) => listing.id === urlSelectedId) ??
    sortedListings.find((listing) => listing.id === storedSelectedId) ??
    sortedListings[0] ??
    null;

  return selected?.id ?? null;
}
