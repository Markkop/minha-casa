import type { ListingData } from "$lib/workspace/client";
import { workspaceApi } from "$lib/workspace/client";

export async function checkDuplicateCandidates(collectionId: string, listingData: ListingData) {
  const result = await workspaceApi.checkDuplicate(collectionId, listingData);
  return result.duplicateCandidates;
}
