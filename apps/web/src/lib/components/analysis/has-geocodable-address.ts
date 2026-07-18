import type { Property } from "$lib/listings/types";

export function hasGeocodableAddress(listing: Property): boolean {
  if (listing.customLat != null && listing.customLng != null) return true;
  const parts = [listing.address, listing.neighborhood, listing.city].filter(
    (p) => typeof p === "string" && p.trim() !== ""
  );
  return parts.length > 0;
}
