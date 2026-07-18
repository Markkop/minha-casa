import type { Component } from "svelte";
import { Bath, BedDouble, Building, Car, CircleDot } from "@lucide/svelte";
import type { Property } from "$lib/listings/types";
import {
  defaultFeatureCatalog,
  getEnabledFeaturesForDisplay,
  type ListingFeatureOption
} from "$lib/listings/listing-features";
import { getFeaturePresentation } from "$lib/listings/listing-feature-present";
import { normalizePropertyType } from "$lib/components/listings/listings-table-shared";

export interface ListingDisplayItem {
  key: string;
  label: string;
  icon: Component<{ class?: string }>;
  iconClassName?: string;
}

function formatBedroomsLabel(bedrooms: number, suites: number | null) {
  if (suites != null && suites > 0) {
    return `${bedrooms} quartos (${suites} suíte${suites === 1 ? "" : "s"})`;
  }
  return bedrooms === 1 ? "1 quarto" : `${bedrooms} quartos`;
}

function formatBathroomsLabel(bathrooms: number) {
  return bathrooms === 1 ? "1 banheiro" : `${bathrooms} banheiros`;
}

function formatParkingSpotsLabel(parkingSpots: number) {
  return parkingSpots === 1 ? "1 vaga" : `${parkingSpots} vagas`;
}

function formatFloorLabel(floor: number) {
  if (floor === 10) return "10º andar ou mais";
  return `${floor}º andar`;
}

export function buildListingCoreFactItems(listing: Property): ListingDisplayItem[] {
  const items: ListingDisplayItem[] = [];
  const propertyType = normalizePropertyType(listing.propertyType);

  const bedrooms = listing.bedrooms ?? 0;
  if (bedrooms > 0) {
    items.push({ key: "bedrooms", label: formatBedroomsLabel(bedrooms, listing.suites ?? null), icon: BedDouble });
  }

  const bathrooms = listing.bathrooms ?? 0;
  if (bathrooms > 0) {
    items.push({ key: "bathrooms", label: formatBathroomsLabel(bathrooms), icon: Bath });
  }

  const parkingSpots = listing.parkingSpots ?? 0;
  if (parkingSpots > 0) {
    items.push({ key: "parkingSpots", label: formatParkingSpotsLabel(parkingSpots), icon: Car });
  }

  if (propertyType === "apartment") {
    const floor = listing.floor ?? 0;
    if (floor > 0) {
      items.push({ key: "floor", label: formatFloorLabel(floor), icon: Building });
    }
  }

  return items;
}

export function buildListingFeatureItems(
  listing: Property,
  catalog: readonly ListingFeatureOption[] = defaultFeatureCatalog()
): ListingDisplayItem[] {
  const items: ListingDisplayItem[] = [];
  const catalogByKey = new Map(catalog.map((option) => [option.key, option]));

  for (const feature of getEnabledFeaturesForDisplay(listing, catalog)) {
    const option = catalogByKey.get(feature.key);
    const presentation = option ? getFeaturePresentation(option) : null;
    items.push({
      key: feature.key,
      label: feature.label,
      icon: presentation?.Icon ?? CircleDot,
      iconClassName: presentation?.iconClass
    });
  }

  return items;
}

export function formatQuartosSuites(bedrooms: number | null, suites: number | null) {
  if (bedrooms === null && suites === null) return "—";
  const q = bedrooms ?? 0;
  const s = suites ?? 0;
  if (s === 0) return `${q}`;
  return `${q} (${s}s)`;
}

export function formatListingNumber(value: number | null) {
  if (value === null) return "—";
  return `${value}`;
}
