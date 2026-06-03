import type { Imovel } from "$lib/anuncios/types";
import {
  getPreferenceValue,
  type ListingPreferenceOption
} from "$lib/anuncios/listing-preferences";
import {
  getPreferencePresentation,
  isApartmentOnlyPreferenceKey,
  MOBILE_AMENITY_KEYS
} from "$lib/anuncios/listing-preference-present";
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
  const isApartment = imovel.tipoImovel === "apartamento";
  const byKey = new Map(catalog.map((option) => [option.key, option]));
  const items: ListingMobileAmenityItem[] = [];

  const orderedKeys = [
    ...MOBILE_AMENITY_KEYS.filter((key) => byKey.has(key)),
    ...catalog.filter((option) => option.source === "custom").map((option) => option.key)
  ];

  for (const key of orderedKeys) {
    const option = byKey.get(key);
    if (!option || !option.visible) continue;
    if (getPreferenceValue(imovel, key, catalog) !== true) continue;
    if (isApartmentOnlyPreferenceKey(key) && !isApartment) continue;

    const { Icon, iconClass } = getPreferencePresentation(option);
    items.push({
      key,
      label: option.label,
      Icon,
      iconClass
    });
  }

  return items;
}

export { layoutListingMobileAmenityRows } from "$lib/components/anuncios/listing-mobile-amenity-layout";
export type { ListingMobileAmenityRow } from "$lib/components/anuncios/listing-mobile-amenity-layout";
