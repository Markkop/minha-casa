import type { Property } from "$lib/listings/types";

export function mergeListingDraft(listing: Property, formData: Partial<Property>): Property {
  return { ...listing, ...formData };
}
