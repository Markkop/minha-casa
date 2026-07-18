import type { Property } from "$lib/listings/types";
import type { ListingFeatureOption } from "$lib/listings/listing-features";
import { getPresentListingFeatureOptions } from "$lib/listings/listing-present-display";
import { getFeaturePresentation } from "$lib/listings/listing-feature-present";
import type { Component } from "svelte";

export type ListingMobileFeatureItem = {
  key: string;
  label: string;
  Icon: Component<{ class?: string }>;
  iconClass: string;
};

export function getListingMobileFeatures(
  property: Property,
  catalog: ListingFeatureOption[]
): ListingMobileFeatureItem[] {
  return getPresentListingFeatureOptions(property, catalog).map((option) => {
    const { Icon, iconClass } = getFeaturePresentation(option);
    return {
      key: option.key,
      label: option.label,
      Icon,
      iconClass
    };
  });
}

export { layoutListingMobileFeatureRows } from "$lib/components/listings/listing-mobile-feature-layout";
export type { ListingMobileFeatureRow } from "$lib/components/listings/listing-mobile-feature-layout";
