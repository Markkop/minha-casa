export type ListingPreferenceSource = "system" | "custom";

export interface ListingPreferenceOption {
  key: string;
  label: string;
  source: ListingPreferenceSource;
  visible: boolean;
  sortOrder: number;
  legacyKey?: string;
}

export type ListingPreferencesMap = Record<string, boolean | null>;

export type LegacyAmenityKey =
  | "piscina"
  | "porteiro24h"
  | "academia"
  | "vistaLivre"
  | "piscinaTermica";

export interface ListingPreferenceListingSlice {
  preferences?: ListingPreferencesMap | null;
  piscina?: boolean | null;
  porteiro24h?: boolean | null;
  academia?: boolean | null;
  vistaLivre?: boolean | null;
  piscinaTermica?: boolean | null;
}

export const DEFAULT_SYSTEM_PREFERENCE_OPTIONS: readonly ListingPreferenceOption[] = [
  { key: "piscina", label: "Piscina", source: "system", visible: true, sortOrder: 0, legacyKey: "piscina" },
  { key: "academia", label: "Academia", source: "system", visible: true, sortOrder: 1, legacyKey: "academia" },
  {
    key: "portaria",
    label: "Portaria 24h",
    source: "system",
    visible: true,
    sortOrder: 2,
    legacyKey: "porteiro24h"
  },
  {
    key: "vista_livre",
    label: "Vista livre",
    source: "system",
    visible: true,
    sortOrder: 3,
    legacyKey: "vistaLivre"
  },
  {
    key: "piscina_termica",
    label: "Piscina térmica",
    source: "system",
    visible: true,
    sortOrder: 4,
    legacyKey: "piscinaTermica"
  },
  { key: "esquina", label: "Esquina", source: "system", visible: true, sortOrder: 5 },
  { key: "cobertura", label: "Cobertura", source: "system", visible: true, sortOrder: 6 },
  { key: "jardim", label: "Jardim", source: "system", visible: true, sortOrder: 7 },
  { key: "terrea", label: "Térrea", source: "system", visible: true, sortOrder: 8 }
] as const;

export function defaultPreferenceCatalog(): ListingPreferenceOption[] {
  return DEFAULT_SYSTEM_PREFERENCE_OPTIONS.map((option) => ({ ...option }));
}

function isPreferenceCatalog(value: unknown): value is ListingPreferenceOption[] {
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
export function coercePreferenceCatalog(catalog: unknown): ListingPreferenceOption[] {
  return isPreferenceCatalog(catalog) ? catalog.map((option) => ({ ...option })) : defaultPreferenceCatalog();
}

export function sortPreferenceCatalog(catalog: ListingPreferenceOption[]): ListingPreferenceOption[] {
  const safe = coercePreferenceCatalog(catalog);
  return [...safe].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "pt-BR"));
}

export function preferenceDisplayLabel(option: Pick<ListingPreferenceOption, "label">): string {
  return option.label;
}

export function slugifyPreferenceKey(label: string): string {
  const normalized = label
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || "preferencia";
}

export function ensureUniquePreferenceKey(
  baseKey: string,
  catalog: readonly Pick<ListingPreferenceOption, "key">[]
): string {
  const used = new Set(catalog.map((option) => option.key));
  if (!used.has(baseKey)) return baseKey;

  let index = 2;
  while (used.has(`${baseKey}_${index}`)) {
    index += 1;
  }
  return `${baseKey}_${index}`;
}

function readLegacyValue(listing: ListingPreferenceListingSlice, legacyKey: LegacyAmenityKey): boolean | null {
  const value = listing[legacyKey];
  return value === true || value === false ? value : null;
}

function legacyValueForOption(
  listing: ListingPreferenceListingSlice,
  option: Pick<ListingPreferenceOption, "key" | "legacyKey">
): boolean | null {
  const fromMap = listing.preferences?.[option.key];
  if (fromMap === true || fromMap === false) return fromMap;
  if (option.legacyKey) {
    return readLegacyValue(listing, option.legacyKey as LegacyAmenityKey);
  }
  return null;
}

export function normalizeListingPreferences(
  listing: ListingPreferenceListingSlice,
  catalog: readonly ListingPreferenceOption[] = DEFAULT_SYSTEM_PREFERENCE_OPTIONS
): ListingPreferencesMap {
  const safeCatalog = isPreferenceCatalog(catalog) ? catalog : DEFAULT_SYSTEM_PREFERENCE_OPTIONS;
  const preferences: ListingPreferencesMap = { ...(listing.preferences ?? {}) };

  for (const option of safeCatalog) {
    preferences[option.key] = legacyValueForOption(listing, option);
  }

  return preferences;
}

export function mirrorLegacyFields(
  preferences: ListingPreferencesMap,
  catalog: readonly ListingPreferenceOption[] = DEFAULT_SYSTEM_PREFERENCE_OPTIONS
): Pick<ListingPreferenceListingSlice, LegacyAmenityKey> {
  const safeCatalog = isPreferenceCatalog(catalog) ? catalog : DEFAULT_SYSTEM_PREFERENCE_OPTIONS;
  const legacy: Pick<ListingPreferenceListingSlice, LegacyAmenityKey> = {
    piscina: null,
    porteiro24h: null,
    academia: null,
    vistaLivre: null,
    piscinaTermica: null
  };

  for (const option of safeCatalog) {
    if (!option.legacyKey) continue;
    const value = preferences[option.key];
    legacy[option.legacyKey as LegacyAmenityKey] = value === true || value === false ? value : null;
  }

  return legacy;
}

export function applyPreferencePatch(
  listing: ListingPreferenceListingSlice,
  key: string,
  value: boolean | null,
  catalog: readonly ListingPreferenceOption[] = DEFAULT_SYSTEM_PREFERENCE_OPTIONS
): ListingPreferenceListingSlice & { preferences: ListingPreferencesMap } {
  const preferences = normalizeListingPreferences(listing, catalog);
  preferences[key] = value;
  const legacy = mirrorLegacyFields(preferences, catalog);
  return { ...listing, ...legacy, preferences };
}

export function togglePreferenceValue(current: boolean | null | undefined): boolean {
  return current !== true;
}

export function getPreferenceValue(
  listing: ListingPreferenceListingSlice,
  key: string,
  catalog: readonly ListingPreferenceOption[] = DEFAULT_SYSTEM_PREFERENCE_OPTIONS
): boolean | null {
  const preferences = normalizeListingPreferences(listing, catalog);
  const value = preferences[key];
  return value === true || value === false ? value : null;
}

export interface ListingPreferenceDisplayItem {
  key: string;
  label: string;
  value: true;
}

export function getEnabledPreferencesForDisplay(
  listing: ListingPreferenceListingSlice,
  catalog: readonly ListingPreferenceOption[] = DEFAULT_SYSTEM_PREFERENCE_OPTIONS
): ListingPreferenceDisplayItem[] {
  const preferences = normalizeListingPreferences(listing, catalog);
  return sortPreferenceCatalog([...catalog])
    .filter((option) => option.visible && preferences[option.key] === true)
    .map((option) => ({
      key: option.key,
      label: preferenceDisplayLabel(option),
      value: true as const
    }));
}

export function formatEnabledPreferencesForExport(
  listing: ListingPreferenceListingSlice,
  catalog: readonly ListingPreferenceOption[] = DEFAULT_SYSTEM_PREFERENCE_OPTIONS
): string[] {
  return getEnabledPreferencesForDisplay(listing, catalog).map((item) => item.label);
}

export function listingDataWithPreferences(
  listing: ListingPreferenceListingSlice,
  catalog: readonly ListingPreferenceOption[] = DEFAULT_SYSTEM_PREFERENCE_OPTIONS
): ListingPreferenceListingSlice & { preferences: ListingPreferencesMap } {
  const preferences = normalizeListingPreferences(listing, catalog);
  return { ...listing, ...mirrorLegacyFields(preferences, catalog), preferences };
}
