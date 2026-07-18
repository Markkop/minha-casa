import type { ListingData } from "$lib/workspace/client";

export const LISTING_IMPORT_QUEUE_EVENT = "minha-casa:queue-listing-imports";

export interface ListingImportQueueDetail {
  collectionId: string;
  listings: ListingData[];
}

export function queueListingImports(detail: ListingImportQueueDetail) {
  window.dispatchEvent(
    new CustomEvent<ListingImportQueueDetail>(LISTING_IMPORT_QUEUE_EVENT, { detail })
  );
}
