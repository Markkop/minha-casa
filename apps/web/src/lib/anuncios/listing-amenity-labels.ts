import type { Component } from "svelte";
import { Bath, BedDouble, Building, Car, CircleDot } from "@lucide/svelte";
import type { Imovel } from "$lib/anuncios/types";
import {
  defaultPreferenceCatalog,
  getEnabledPreferencesForDisplay,
  type ListingPreferenceOption
} from "$lib/anuncios/listing-preferences";
import { getPreferencePresentation } from "$lib/anuncios/listing-preference-present";
import { normalizeTipoImovel } from "$lib/components/anuncios/listings-table-shared";

export interface ListingAmenityItem {
  key: string;
  label: string;
  icon: Component<{ class?: string }>;
  iconClassName?: string;
}

function formatQuartosLabel(quartos: number, suites: number | null) {
  if (suites != null && suites > 0) {
    return `${quartos} quartos (${suites} suíte${suites === 1 ? "" : "s"})`;
  }
  return quartos === 1 ? "1 quarto" : `${quartos} quartos`;
}

function formatBanheirosLabel(banheiros: number) {
  return banheiros === 1 ? "1 banheiro" : `${banheiros} banheiros`;
}

function formatVagasLabel(garagem: number) {
  return garagem === 1 ? "1 vaga" : `${garagem} vagas`;
}

function formatAndarLabel(andar: number) {
  if (andar === 10) return "10º andar ou mais";
  return `${andar}º andar`;
}

export function buildListingCoreAmenityItems(listing: Imovel): ListingAmenityItem[] {
  const items: ListingAmenityItem[] = [];
  const tipo = normalizeTipoImovel(listing.tipoImovel);

  const quartos = listing.quartos ?? 0;
  if (quartos > 0) {
    items.push({ key: "quartos", label: formatQuartosLabel(quartos, listing.suites ?? null), icon: BedDouble });
  }

  const banheiros = listing.banheiros ?? 0;
  if (banheiros > 0) {
    items.push({ key: "banheiros", label: formatBanheirosLabel(banheiros), icon: Bath });
  }

  const garagem = listing.garagem ?? 0;
  if (garagem > 0) {
    items.push({ key: "garagem", label: formatVagasLabel(garagem), icon: Car });
  }

  if (tipo === "apartamento") {
    const andar = listing.andar ?? 0;
    if (andar > 0) {
      items.push({ key: "andar", label: formatAndarLabel(andar), icon: Building });
    }
  }

  return items;
}

export function buildListingAmenityItems(
  listing: Imovel,
  catalog: readonly ListingPreferenceOption[] = defaultPreferenceCatalog()
): ListingAmenityItem[] {
  const items: ListingAmenityItem[] = [];
  const catalogByKey = new Map(catalog.map((option) => [option.key, option]));

  for (const preference of getEnabledPreferencesForDisplay(listing, catalog)) {
    const option = catalogByKey.get(preference.key);
    const presentation = option ? getPreferencePresentation(option) : null;
    items.push({
      key: preference.key,
      label: preference.label,
      icon: presentation?.Icon ?? CircleDot,
      iconClassName: presentation?.iconClass
    });
  }

  return items;
}

export function formatQuartosSuites(quartos: number | null, suites: number | null) {
  if (quartos === null && suites === null) return "—";
  const q = quartos ?? 0;
  const s = suites ?? 0;
  if (s === 0) return `${q}`;
  return `${q} (${s}s)`;
}

export function formatListingNumber(value: number | null) {
  if (value === null) return "—";
  return `${value}`;
}
