import type { Property } from "$lib/listings/types";

export function listingEditSnapshot(formData: Partial<Property>): string {
  return JSON.stringify(formData);
}

export function hasUnsavedListingEdits(
  formData: Partial<Property>,
  initialSnapshot: string
): boolean {
  return listingEditSnapshot(formData) !== initialSnapshot;
}
