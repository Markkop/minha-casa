import type { Property } from "$lib/listings/types";
import type { ListingCountField } from "$lib/listings/listing-count-field";
import {
  getFeatureValue,
  type ListingFeatureOption
} from "$lib/listings/listing-features";
import {
  isApartmentOnlyFeatureKey,
  MOBILE_FEATURE_KEYS
} from "$lib/listings/listing-feature-toolbar";

export function shouldShowListingCountField(
  field: ListingCountField,
  listing: Pick<Property, "bedrooms" | "bathrooms" | "parkingSpots" | "floor" | "propertyType">
): boolean {
  switch (field) {
    case "bedrooms":
      return (listing.bedrooms ?? 0) > 0;
    case "bathrooms":
      return (listing.bathrooms ?? 0) > 0;
    case "parkingSpots":
      return (listing.parkingSpots ?? 0) > 0;
    case "floor":
      return listing.propertyType === "apartment" && (listing.floor ?? 0) > 0;
  }
}

export function getPresentListingFeatureOptions(
  listing: Property,
  catalog: readonly ListingFeatureOption[]
): ListingFeatureOption[] {
  const isApartment = listing.propertyType === "apartment";
  const byKey = new Map(catalog.map((option) => [option.key, option]));
  const orderedKeys = [
    ...MOBILE_FEATURE_KEYS.filter((key) => byKey.has(key)),
    ...catalog.filter((option) => option.source === "custom").map((option) => option.key)
  ];
  const options: ListingFeatureOption[] = [];

  for (const key of orderedKeys) {
    const option = byKey.get(key);
    if (!option || !option.visible) continue;
    if (getFeatureValue(listing, key, catalog) !== true) continue;
    if (isApartmentOnlyFeatureKey(key) && !isApartment) continue;
    options.push(option);
  }

  return options;
}

export function hasPresentToolbarContent(
  listing: Property,
  catalog: readonly ListingFeatureOption[],
  showCountFeatures: boolean
): boolean {
  if (getPresentListingFeatureOptions(listing, catalog).length > 0) return true;
  if (!showCountFeatures) return false;
  const fields: ListingCountField[] = ["bedrooms", "bathrooms", "parkingSpots", "floor"];
  return fields.some((field) => shouldShowListingCountField(field, listing));
}
