import type { Collection, Imovel } from "$lib/anuncios/types";

export function removeListingFromCollectionState({
  listings,
  collections,
  activeCollection,
  collectionId,
  listingId
}: {
  listings: Imovel[];
  collections: Collection[];
  activeCollection: Collection | null;
  collectionId: string;
  listingId: string;
}) {
  const nextListings = listings.filter((listing) => listing.id !== listingId);
  const nextCount = nextListings.length;
  const nextCollections = collections.map((collection) =>
    collection.id === collectionId ? { ...collection, listingsCount: nextCount } : collection
  );
  const nextActiveCollection =
    activeCollection?.id === collectionId
      ? { ...activeCollection, listingsCount: nextCount }
      : activeCollection;

  return {
    listings: nextListings,
    collections: nextCollections,
    activeCollection: nextActiveCollection
  };
}
