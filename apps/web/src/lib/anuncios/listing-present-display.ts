import type { Imovel } from "$lib/anuncios/types";
import type { ListingCountField } from "$lib/anuncios/listing-count-field";
import {
  getPreferenceValue,
  type ListingPreferenceOption
} from "$lib/anuncios/listing-preferences";
import {
  isApartmentOnlyPreferenceKey,
  MOBILE_AMENITY_KEYS
} from "$lib/anuncios/listing-preference-toolbar";

export function shouldShowListingCountField(
  field: ListingCountField,
  listing: Pick<Imovel, "quartos" | "banheiros" | "garagem" | "andar" | "tipoImovel">
): boolean {
  switch (field) {
    case "quartos":
      return (listing.quartos ?? 0) > 0;
    case "banheiros":
      return (listing.banheiros ?? 0) > 0;
    case "garagem":
      return (listing.garagem ?? 0) > 0;
    case "andar":
      return listing.tipoImovel === "apartamento" && (listing.andar ?? 0) > 0;
  }
}

export function getPresentListingPreferenceOptions(
  listing: Imovel,
  catalog: readonly ListingPreferenceOption[]
): ListingPreferenceOption[] {
  const isApartment = listing.tipoImovel === "apartamento";
  const byKey = new Map(catalog.map((option) => [option.key, option]));
  const orderedKeys = [
    ...MOBILE_AMENITY_KEYS.filter((key) => byKey.has(key)),
    ...catalog.filter((option) => option.source === "custom").map((option) => option.key)
  ];
  const options: ListingPreferenceOption[] = [];

  for (const key of orderedKeys) {
    const option = byKey.get(key);
    if (!option || !option.visible) continue;
    if (getPreferenceValue(listing, key, catalog) !== true) continue;
    if (isApartmentOnlyPreferenceKey(key) && !isApartment) continue;
    options.push(option);
  }

  return options;
}

export function hasPresentToolbarContent(
  listing: Imovel,
  catalog: readonly ListingPreferenceOption[],
  showCountFeatures: boolean
): boolean {
  if (getPresentListingPreferenceOptions(listing, catalog).length > 0) return true;
  if (!showCountFeatures) return false;
  const fields: ListingCountField[] = ["quartos", "banheiros", "garagem", "andar"];
  return fields.some((field) => shouldShowListingCountField(field, listing));
}
