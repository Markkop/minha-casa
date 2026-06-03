export const PROPERTY_DISPLAY_STORAGE_KEY = "minha-casa:listings-table-property-display"

export type MetricVariant = "total" | "privado"

export interface ListingsPropertyDisplayPrefs {
  showAddress: boolean
  /** Quartos, banheiros, garagem e andar na listagem. */
  showCountFeatures: boolean
  showContact: boolean
  showMetricTotal: boolean
  showMetricPrivado: boolean
}

export const DEFAULT_PROPERTY_DISPLAY: ListingsPropertyDisplayPrefs = {
  showAddress: true,
  showCountFeatures: true,
  showContact: false,
  showMetricTotal: true,
  showMetricPrivado: true,
}

const PREF_KEYS: (keyof ListingsPropertyDisplayPrefs)[] = [
  "showAddress",
  "showCountFeatures",
  "showContact",
  "showMetricTotal",
  "showMetricPrivado",
]

export function getEnabledMetricVariants(
  prefs: ListingsPropertyDisplayPrefs
): Set<MetricVariant> {
  const variants = new Set<MetricVariant>()
  if (prefs.showMetricTotal) variants.add("total")
  if (prefs.showMetricPrivado) variants.add("privado")
  if (variants.size === 0) {
    variants.add("total")
    variants.add("privado")
  }
  return variants
}

export function normalizePropertyDisplay(value: unknown): ListingsPropertyDisplayPrefs {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_PROPERTY_DISPLAY }
  }

  const raw = value as Partial<
    Record<keyof ListingsPropertyDisplayPrefs | "showPropertyIcons", unknown>
  >
  const prefs = PREF_KEYS.reduce(
    (acc, key) => {
      const stored =
        key === "showCountFeatures"
          ? (raw.showCountFeatures ?? raw.showPropertyIcons)
          : raw[key]
      acc[key] =
        typeof stored === "boolean" ? stored : DEFAULT_PROPERTY_DISPLAY[key]
      return acc
    },
    {} as ListingsPropertyDisplayPrefs
  )

  if (!prefs.showMetricTotal && !prefs.showMetricPrivado) {
    return {
      ...prefs,
      showMetricTotal: true,
      showMetricPrivado: true,
    }
  }

  return prefs
}

export function getInitialPropertyDisplay(): ListingsPropertyDisplayPrefs {
  if (typeof window === "undefined") {
    return { ...DEFAULT_PROPERTY_DISPLAY }
  }

  try {
    return normalizePropertyDisplay(
      JSON.parse(window.localStorage.getItem(PROPERTY_DISPLAY_STORAGE_KEY) || "null")
    )
  } catch {
    return { ...DEFAULT_PROPERTY_DISPLAY }
  }
}

export function shouldShowPropertyTypeFilters(
  listings: { tipoImovel?: string | null }[]
): boolean {
  const hasCasa = listings.some((listing) => listing.tipoImovel === "casa")
  const hasApartamento = listings.some((listing) => listing.tipoImovel === "apartamento")
  return hasCasa && hasApartamento
}

export function setPropertyDisplayPref(
  prefs: ListingsPropertyDisplayPrefs,
  key: keyof ListingsPropertyDisplayPrefs,
  value: boolean
): ListingsPropertyDisplayPrefs {
  if (!value && (key === "showMetricTotal" || key === "showMetricPrivado")) {
    const otherKey = key === "showMetricTotal" ? "showMetricPrivado" : "showMetricTotal"
    if (!prefs[otherKey]) {
      return prefs
    }
  }

  return { ...prefs, [key]: value }
}
