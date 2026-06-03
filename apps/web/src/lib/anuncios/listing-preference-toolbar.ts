import type { Imovel } from "$lib/anuncios/types";
import {
  sortPreferenceCatalog,
  type ListingPreferenceOption
} from "$lib/anuncios/listing-preferences";
import type { ListingToolbarVisibility } from "$lib/anuncios/listing-toolbar-visibility";

const LEGACY_TOOLBAR_KEYS = [
  "piscina",
  "piscina_termica",
  "portaria",
  "academia",
  "vista_livre"
] as const;

export const EXTRA_SYSTEM_TOOLBAR_KEYS = ["esquina", "cobertura", "jardim", "terrea"] as const;

export const APARTMENT_TOOLBAR_PREFERENCE_KEYS = [
  "piscina_termica",
  "portaria",
  "academia"
] as const;

export const MOBILE_AMENITY_KEYS = [
  "piscina",
  "piscina_termica",
  "academia",
  "portaria",
  "vista_livre",
  "esquina",
  "cobertura",
  "jardim",
  "terrea"
] as const;

export function getToolbarPreferenceOptions(
  catalog: ListingPreferenceOption[]
): ListingPreferenceOption[] {
  const byKey = new Map(catalog.map((option) => [option.key, option]));
  const ordered: ListingPreferenceOption[] = [];

  for (const key of LEGACY_TOOLBAR_KEYS) {
    const option = byKey.get(key);
    if (option) ordered.push(option);
  }

  for (const key of EXTRA_SYSTEM_TOOLBAR_KEYS) {
    const option = byKey.get(key);
    if (option) ordered.push(option);
  }

  for (const option of sortPreferenceCatalog(catalog)) {
    if (option.source === "custom") ordered.push(option);
  }

  return ordered;
}

export function shouldShowToolbarPreference(
  option: ListingPreferenceOption,
  imovel: Pick<Imovel, "tipoImovel">,
  visibility: ListingToolbarVisibility
): boolean {
  if (option.source === "custom") return true;

  switch (option.key) {
    case "piscina":
      return visibility.showPiscina;
    case "vista_livre":
      return visibility.showVistaLivre;
    case "piscina_termica":
    case "portaria":
    case "academia":
      return imovel.tipoImovel === "apartamento";
    default:
      return true;
  }
}

export function isApartmentOnlyPreferenceKey(key: string): boolean {
  return key === "piscina_termica" || key === "portaria" || key === "academia";
}
