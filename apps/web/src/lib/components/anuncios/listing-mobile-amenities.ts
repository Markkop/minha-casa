import type { Imovel } from "$lib/anuncios/types";
import type { ListingPreferenceOption } from "$lib/anuncios/listing-preferences";
import { getPresentListingPreferenceOptions } from "$lib/anuncios/listing-present-display";
import { getPreferencePresentation } from "$lib/anuncios/listing-preference-present";
import type { Component } from "svelte";

export type ListingMobileAmenityItem = {
  key: string;
  label: string;
  Icon: Component<{ class?: string }>;
  iconClass: string;
};

export function getListingMobileAmenities(
  imovel: Imovel,
  catalog: ListingPreferenceOption[]
): ListingMobileAmenityItem[] {
  return getPresentListingPreferenceOptions(imovel, catalog).map((option) => {
    const { Icon, iconClass } = getPreferencePresentation(option);
    return {
      key: option.key,
      label: option.label,
      Icon,
      iconClass
    };
  });
}

export { layoutListingMobileAmenityRows } from "$lib/components/anuncios/listing-mobile-amenity-layout";
export type { ListingMobileAmenityRow } from "$lib/components/anuncios/listing-mobile-amenity-layout";
