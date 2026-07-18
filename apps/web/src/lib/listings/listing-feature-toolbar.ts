import type { Property } from "$lib/listings/types";
import {
  sortFeatureCatalog,
  type ListingFeatureOption
} from "$lib/listings/listing-features";
import type { ListingToolbarVisibility } from "$lib/listings/listing-toolbar-visibility";

const SYSTEM_TOOLBAR_KEYS = [
  "pool",
  "heatedPool",
  "doorman24h",
  "gym",
  "unobstructedView"
] as const;

export const EXTRA_SYSTEM_TOOLBAR_KEYS = ["cornerLot", "penthouse", "garden", "singleStory"] as const;

export const APARTMENT_TOOLBAR_FEATURE_KEYS = [
  "heatedPool",
  "doorman24h",
  "gym"
] as const;

export const MOBILE_FEATURE_KEYS = [
  "pool",
  "heatedPool",
  "gym",
  "doorman24h",
  "unobstructedView",
  "cornerLot",
  "penthouse",
  "garden",
  "singleStory"
] as const;

export function getToolbarFeatureOptions(
  catalog: ListingFeatureOption[]
): ListingFeatureOption[] {
  const byKey = new Map(catalog.map((option) => [option.key, option]));
  const ordered: ListingFeatureOption[] = [];

  for (const key of SYSTEM_TOOLBAR_KEYS) {
    const option = byKey.get(key);
    if (option) ordered.push(option);
  }

  for (const key of EXTRA_SYSTEM_TOOLBAR_KEYS) {
    const option = byKey.get(key);
    if (option) ordered.push(option);
  }

  for (const option of sortFeatureCatalog(catalog)) {
    if (option.source === "custom") ordered.push(option);
  }

  return ordered;
}

export function shouldShowToolbarFeature(
  option: ListingFeatureOption,
  property: Pick<Property, "propertyType">,
  visibility: ListingToolbarVisibility
): boolean {
  if (option.source === "custom") return true;

  switch (option.key) {
    case "pool":
      return visibility.showPool;
    case "unobstructedView":
      return visibility.showUnobstructedView;
    case "heatedPool":
    case "doorman24h":
    case "gym":
      return property.propertyType === "apartment";
    default:
      return true;
  }
}

export function isApartmentOnlyFeatureKey(key: string): boolean {
  return key === "heatedPool" || key === "doorman24h" || key === "gym";
}
