import { defaultFeatureCatalog, listingDataWithFeatures } from "$lib/listings/listing-features";
import type { ListingData } from "$lib/workspace/client";

const DUPLICATE_REASON_LABELS: Record<string, string> = {
  same_url: "mesmo link",
  same_address_price_area: "mesmo endereço, preço e área",
  same_address_price: "mesmo endereço e preço",
  same_address: "mesmo endereço",
  same_address_similar_cover: "mesmo endereço e foto parecida",
  similar_cover_image: "foto de capa parecida",
  none: "similaridade alta",
}

const DEFAULT_DUPLICATE_REASON_LABEL = "Imóvel parecido já existe na coleção"

/**
 * Maps Phoenix duplicate reason keys (e.g. `same_url`) to Portuguese labels.
 * Unknown values are returned as-is (already human-readable text).
 */
export function formatDuplicateReason(reason: string | undefined | null): string {
  if (!reason?.trim()) return DEFAULT_DUPLICATE_REASON_LABEL
  const trimmed = reason.trim()
  return DUPLICATE_REASON_LABELS[trimmed] ?? trimmed
}

/** Minimal listing payload for same-URL duplicate checks before AI parse. */
export function listingDataForLinkDuplicateCheck(sourceUrl: string): ListingData {
  const catalog = defaultFeatureCatalog();
  const features = Object.fromEntries(catalog.map((option) => [option.key, null]));
  const data: ListingData = {
    title: "",
    address: "",
    sourceUrl,
    totalAreaM2: null,
    privateAreaM2: null,
    bedrooms: null,
    suites: null,
    bathrooms: null,
    parkingSpots: null,
    price: null,
    pricePerM2: null,
    propertyType: undefined,
    features
  };

  return listingDataWithFeatures(data, catalog);
}
