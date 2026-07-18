export type ListingFeatureSource = "system" | "custom";

export interface ListingFeatureOption {
  key: string;
  label: string;
  source: ListingFeatureSource;
  visible: boolean;
  sortOrder: number;
}

export type ListingFeaturesMap = Record<string, boolean | null>;

export interface ListingFeatureListingSlice {
  features?: ListingFeaturesMap | null;
}

export const DEFAULT_SYSTEM_FEATURE_OPTIONS: readonly ListingFeatureOption[] = [
  { key: "pool", label: "Piscina", source: "system", visible: true, sortOrder: 0 },
  { key: "gym", label: "Academia", source: "system", visible: true, sortOrder: 1 },
  { key: "doorman24h", label: "Portaria 24h", source: "system", visible: true, sortOrder: 2 },
  { key: "unobstructedView", label: "Vista livre", source: "system", visible: true, sortOrder: 3 },
  { key: "heatedPool", label: "Piscina térmica", source: "system", visible: true, sortOrder: 4 },
  { key: "cornerLot", label: "Esquina", source: "system", visible: true, sortOrder: 5 },
  { key: "penthouse", label: "Cobertura", source: "system", visible: true, sortOrder: 6 },
  { key: "garden", label: "Jardim", source: "system", visible: true, sortOrder: 7 },
  { key: "singleStory", label: "Térrea", source: "system", visible: true, sortOrder: 8 }
] as const;

export function defaultFeatureCatalog(): ListingFeatureOption[] {
  return DEFAULT_SYSTEM_FEATURE_OPTIONS.map((option) => ({ ...option }));
}

function isFeatureCatalog(value: unknown): value is ListingFeatureOption[] {
  return (
    Array.isArray(value) &&
    value.every(
      (option) =>
        option &&
        typeof option === "object" &&
        typeof option.key === "string" &&
        typeof option.label === "string"
    )
  );
}

/** Ensures catalog is an array (API payloads and `.map(fn)` footguns may pass invalid values). */
export function coerceFeatureCatalog(catalog: unknown): ListingFeatureOption[] {
  return isFeatureCatalog(catalog) ? catalog.map((option) => ({ ...option })) : defaultFeatureCatalog();
}

export function sortFeatureCatalog(catalog: ListingFeatureOption[]): ListingFeatureOption[] {
  const safe = coerceFeatureCatalog(catalog);
  return [...safe].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "pt-BR"));
}

export function featureDisplayLabel(option: Pick<ListingFeatureOption, "label">): string {
  return option.label;
}

export function slugifyFeatureKey(label: string): string {
  const normalized = label
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || "feature";
}

export function ensureUniqueFeatureKey(
  baseKey: string,
  catalog: readonly Pick<ListingFeatureOption, "key">[]
): string {
  const used = new Set(catalog.map((option) => option.key));
  if (!used.has(baseKey)) return baseKey;

  let index = 2;
  while (used.has(`${baseKey}_${index}`)) {
    index += 1;
  }
  return `${baseKey}_${index}`;
}

export function normalizeListingFeatures(
  listing: ListingFeatureListingSlice,
  catalog: readonly ListingFeatureOption[] = DEFAULT_SYSTEM_FEATURE_OPTIONS
): ListingFeaturesMap {
  const safeCatalog = isFeatureCatalog(catalog) ? catalog : DEFAULT_SYSTEM_FEATURE_OPTIONS;
  const features: ListingFeaturesMap = { ...(listing.features ?? {}) };

  for (const option of safeCatalog) {
    const value = features[option.key];
    features[option.key] = value === true || value === false ? value : null;
  }

  return features;
}

export function applyFeaturePatch<T extends ListingFeatureListingSlice>(
  listing: T,
  key: string,
  value: boolean | null,
  catalog: readonly ListingFeatureOption[] = DEFAULT_SYSTEM_FEATURE_OPTIONS
): T & { features: ListingFeaturesMap } {
  const features = normalizeListingFeatures(listing, catalog);
  features[key] = value;
  return { ...listing, features };
}

export function toggleFeatureValue(current: boolean | null | undefined): boolean {
  return current !== true;
}

export function getFeatureValue(
  listing: ListingFeatureListingSlice,
  key: string,
  catalog: readonly ListingFeatureOption[] = DEFAULT_SYSTEM_FEATURE_OPTIONS
): boolean | null {
  const features = normalizeListingFeatures(listing, catalog);
  const value = features[key];
  return value === true || value === false ? value : null;
}

export interface ListingFeatureDisplayItem {
  key: string;
  label: string;
  value: true;
}

export function getEnabledFeaturesForDisplay(
  listing: ListingFeatureListingSlice,
  catalog: readonly ListingFeatureOption[] = DEFAULT_SYSTEM_FEATURE_OPTIONS
): ListingFeatureDisplayItem[] {
  const features = normalizeListingFeatures(listing, catalog);
  return sortFeatureCatalog([...catalog])
    .filter((option) => option.visible && features[option.key] === true)
    .map((option) => ({
      key: option.key,
      label: featureDisplayLabel(option),
      value: true as const
    }));
}

export function formatEnabledFeaturesForExport(
  listing: ListingFeatureListingSlice,
  catalog: readonly ListingFeatureOption[] = DEFAULT_SYSTEM_FEATURE_OPTIONS
): string[] {
  return getEnabledFeaturesForDisplay(listing, catalog).map((item) => item.label);
}

export function listingDataWithFeatures<T extends ListingFeatureListingSlice>(
  listing: T,
  catalog: readonly ListingFeatureOption[] = DEFAULT_SYSTEM_FEATURE_OPTIONS
): T & { features: ListingFeaturesMap } {
  const features = normalizeListingFeatures(listing, catalog);
  return { ...listing, features };
}
