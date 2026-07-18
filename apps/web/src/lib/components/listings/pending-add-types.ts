import type { ListingData } from "$lib/workspace/client";
import type { ParseRequest } from "$lib/listings/parse-input-types";
import type { PendingParsedListing } from "$lib/components/listings/ParserReviewList.svelte";

export type PendingAddStatus =
  | "processing"
  | "review"
  | "duplicate"
  | "skipped"
  | "saving"
  | "error";

export interface PendingAddRow {
  id: string;
  status: PendingAddStatus;
  message?: string;
  parseInput?: ParseRequest;
  parsedData?: ListingData;
  collectionId?: string;
  duplicateCandidates?: { listingId: string; reason: string }[];
  reviewItems?: PendingParsedListing[];
  retryValue?: string;
  retryFiles?: File[];
}

export function createPendingId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
