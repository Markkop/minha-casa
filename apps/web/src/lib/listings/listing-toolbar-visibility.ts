import type { Property } from "$lib/listings/types";

type PropertyTypeValue = "house" | "apartment" | null;

function normalizePropertyType(value: Property["propertyType"]): PropertyTypeValue {
  if (value === "house" || value === "apartment") return value;
  return null;
}

export type ListingToolbarVisibility = {
  showPropertyType: boolean;
  showPool: boolean;
  showUnobstructedView: boolean;
};

export const DEFAULT_LISTING_TOOLBAR_VISIBILITY: ListingToolbarVisibility = {
  showPropertyType: true,
  showPool: true,
  showUnobstructedView: true
};

/** Edit dialog shows every toolbar control regardless of list uniformity. */
export const EDIT_MODAL_TOOLBAR_VISIBILITY: ListingToolbarVisibility = {
  showPropertyType: true,
  showPool: true,
  showUnobstructedView: true
};

function hasFeature(listing: Pick<Property, "features">, key: string): boolean {
  return listing.features?.[key] === true;
}

function isUniform<T>(values: T[]): boolean {
  if (values.length <= 1) return true;
  const first = values[0];
  return values.every((value) => value === first);
}

export function computeListingToolbarVisibility(
  listings: Pick<Property, "propertyType" | "features">[]
): ListingToolbarVisibility {
  if (listings.length === 0) {
    return {
      showPropertyType: true,
      showPool: true,
      showUnobstructedView: true
    };
  }

  const tipos = listings.map((listing) => normalizePropertyType(listing.propertyType));
  const pools = listings.map((listing) => hasFeature(listing, "pool"));
  const unobstructedViews = listings.map((listing) =>
    hasFeature(listing, "unobstructedView")
  );

  return {
    showPropertyType: !isUniform(tipos),
    showPool: !isUniform(pools),
    showUnobstructedView: !isUniform(unobstructedViews)
  };
}
