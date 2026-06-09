export async function deleteAnalysisListing({
  listingId,
  collectionId,
  removeListing,
  clearStoredListing,
  navigate
}: {
  listingId: string;
  collectionId: string | null;
  removeListing: (listingId: string) => Promise<void>;
  clearStoredListing: (collectionId: string) => void;
  navigate: (path: string) => Promise<void>;
}) {
  await removeListing(listingId);
  if (collectionId) clearStoredListing(collectionId);
  await navigate("/anuncios");
}
