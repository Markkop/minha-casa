/**
 * Deterministic listing titles (post-parse). Collection-scoped disambiguation.
 */

export type ListingTitleInput = {
  id?: string
  title?: string
  manualTitle?: string | null
  propertyType?: "house" | "apartment" | null
  bedrooms?: number | null
  neighborhood?: string | null
  city?: string | null
  address?: string
  price?: number | null
  totalAreaM2?: number | null
  floor?: number | null
  condominiumName?: string | null
  createdAt?: string
}

const STREET_PREFIX_PATTERN =
  /^(?:rua|r\.|av\.?|avenida|alameda|al\.?|travessa|trav\.?|rodovia|estrada|servidão|servidao|praça|praca|largo)\s+/i

const STREET_TOKEN_PATTERN =
  /\b(rua|av\.?|avenida|alameda|travessa|rodovia|estrada|servidão|servidao|praça|praca|largo)\b/i

export const LISTING_TITLE_REGEN_FIELDS = [
  "address",
  "neighborhood",
  "city",
  "manualTitle",
] as const

export type ListingTitleRegenField = (typeof LISTING_TITLE_REGEN_FIELDS)[number]

export function listingTitleRegenFieldChanged(
  updates: Partial<ListingTitleInput>
): boolean {
  return LISTING_TITLE_REGEN_FIELDS.some(
    (field) => field in updates && updates[field as keyof ListingTitleInput] !== undefined
  )
}

function normalizeLocationLabel(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (word.length === 0) return word
      const lower = word.toLowerCase()
      if (lower.length <= 3 && lower === lower.toUpperCase()) return word
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(" ")
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

export function extractStreetLabelTwoWords(address: string): string | null {
  const trimmed = address?.trim()
  if (!trimmed) return null

  let rest = trimmed
  if (STREET_PREFIX_PATTERN.test(rest)) {
    rest = rest.replace(STREET_PREFIX_PATTERN, "").trim()
  } else {
    const tokenMatch = rest.match(STREET_TOKEN_PATTERN)
    if (tokenMatch?.index != null) {
      rest = rest.slice(tokenMatch.index + tokenMatch[0].length).trim()
    }
  }

  const tokens = rest
    .replace(/[,.;]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0)

  const words: string[] = []
  for (const token of tokens) {
    if (/^\d+$/.test(token)) break
    words.push(token)
  }

  if (words.length === 0) return null
  return normalizeLocationLabel(words.join(" "))
}

export function extractAddressNumber(address: string): string | null {
  const trimmed = address?.trim()
  if (!trimmed) return null
  const match = trimmed.match(/\b(\d{1,5})\b/)
  return match?.[1] ?? null
}

function propertyTypeLabel(
  propertyType: ListingTitleInput["propertyType"],
  compact = false
): string {
  if (propertyType === "house") return "Casa"
  if (propertyType === "apartment") return compact ? "Apto" : "Apartamento"
  return "Imóvel"
}

/** Shorten property-type prefix in listing titles on narrow screens. */
export function mobileListingDisplayTitle(title: string): string {
  const trimmed = title.trim()
  if (!trimmed) return trimmed
  return trimmed.replace(/^Apartamento\b/, "Apto")
}

export type LocationLevel = "neighborhood" | "city" | "rua"

function locationAtLevel(
  listing: ListingTitleInput,
  level: LocationLevel
): string | null {
  const address = listing.address?.trim() ?? ""

  switch (level) {
    case "neighborhood": {
      const neighborhood = listing.neighborhood?.trim()
      if (neighborhood) return normalizeLocationLabel(neighborhood)
      return null
    }
    case "city": {
      const city = listing.city?.trim()
      if (city) return normalizeLocationLabel(city)
      return null
    }
    case "rua":
      if (isPlaceholderEndereco(address)) return null
      return extractStreetLabelTwoWords(address)
    default:
      return null
  }
}

function isPlaceholderEndereco(address: string | undefined): boolean {
  const trimmed = address?.trim().toLowerCase() ?? ""
  return trimmed === "" || trimmed === "endereço não informado"
}

function baseLocationLabel(listing: ListingTitleInput): string {
  const street = !isPlaceholderEndereco(listing.address)
    ? locationAtLevel(listing, "rua")
    : null
  return (
    street ??
    locationAtLevel(listing, "neighborhood") ??
    locationAtLevel(listing, "city") ??
    "Sem local"
  )
}

export function buildBaseListingTitle(
  listing: ListingTitleInput,
  locationLabel?: string
): string {
  return locationLabel ?? baseLocationLabel(listing)
}

/** Separator between location disambiguation segments in generated titles. */
export const LISTING_TITLE_DISAMBIGUATION_SEPARATOR = " · "

/** Primary title line for compact UI (breadcrumb, selectors) — drops segments after the first separator. */
export function compactListingDisplayTitle(title: string): string {
  const trimmed = title.trim()
  if (!trimmed) return trimmed
  const index = trimmed.indexOf(LISTING_TITLE_DISAMBIGUATION_SEPARATOR)
  if (index === -1) return trimmed
  return trimmed.slice(0, index).trim()
}

/** Comparison table slot header on mobile — property type and room count only. */
export function comparisonMobileSlotListingLabel(
  listing: Pick<ListingTitleInput, "propertyType" | "bedrooms">
): string {
  const tipo = propertyTypeLabel(listing.propertyType, true)
  const bedrooms = listing.bedrooms

  if (bedrooms == null || bedrooms < 0) {
    return tipo
  }

  const quartosLabel = bedrooms === 1 ? "1 quarto" : `${bedrooms} bedrooms`
  return `${tipo} ${quartosLabel}`
}

const LISTING_TITLE_LOCATION_SUFFIX_PATTERN = /\s+(?:em|na)\s+.+$/i

/** Breadcrumb on narrow screens — compact title without the trailing " em …" location. */
export function mobileCompactListingDisplayTitle(title: string): string {
  const compact = compactListingDisplayTitle(title)
  const match = compact.match(LISTING_TITLE_LOCATION_SUFFIX_PATTERN)
  const withoutLocation =
    match && match.index != null ? compact.slice(0, match.index).trim() : compact
  return mobileListingDisplayTitle(withoutLocation)
}

function sortByCreationOrder(a: ListingTitleInput, b: ListingTitleInput): number {
  const aTime = a.createdAt ? Date.parse(a.createdAt) : Number.NaN
  const bTime = b.createdAt ? Date.parse(b.createdAt) : Number.NaN

  if (!Number.isNaN(aTime) && !Number.isNaN(bTime) && aTime !== bTime) {
    return aTime - bTime
  }

  return (a.id ?? "").localeCompare(b.id ?? "")
}

function assignNumberedTitles(group: ListingTitleInput[]): Map<string, string> {
  const assigned = new Map<string, string>()
  const base = baseLocationLabel(group[0]!)
  const sorted = [...group].sort(sortByCreationOrder)

  sorted.forEach((listing, index) => {
    const id = listing.id ?? ""
    assigned.set(id, `${base} (${index + 1})`)
  })

  return assigned
}

/**
 * Build display titles for a collection, with disambiguation for colliding base keys.
 */
export function buildListingDisplayTitles(
  listings: ListingTitleInput[]
): Map<string, string> {
  const result = new Map<string, string>()
  const autoListings = listings.filter((l) => !l.manualTitle?.trim())

  const groups = new Map<string, ListingTitleInput[]>()
  for (const listing of autoListings) {
    const key = normalizeKey(baseLocationLabel(listing))
    const group = groups.get(key) ?? []
    group.push(listing)
    groups.set(key, group)
  }

  for (const group of groups.values()) {
    if (group.length === 1) {
      const listing = group[0]!
      result.set(listing.id ?? "", baseLocationLabel(listing))
      continue
    }

    for (const [id, title] of assignNumberedTitles(group)) {
      result.set(id, title)
    }
  }

  for (const listing of listings) {
    const id = listing.id ?? ""
    if (listing.manualTitle?.trim()) {
      result.set(id, listing.manualTitle.trim())
    } else if (!result.has(id) && id) {
      result.set(id, buildBaseListingTitle(listing))
    }
  }

  return result
}

/** Property list/map titles use the same scheme as collection titles. */
export function buildPropertyListDisplayTitles(
  listings: ListingTitleInput[]
): Map<string, string> {
  return buildListingDisplayTitles(listings)
}

export function resolveListingDisplayTitle(
  listing: ListingTitleInput,
  titlesMap?: Map<string, string>
): string {
  if (listing.manualTitle?.trim()) {
    return listing.manualTitle.trim()
  }
  if (listing.id && titlesMap?.has(listing.id)) {
    return titlesMap.get(listing.id)!
  }
  return buildBaseListingTitle(listing)
}

/** Apply generated titles to listing data objects (pre-import, no ids yet). */
export function applyGeneratedTitlesToListingData<
  T extends ListingTitleInput & { title?: string },
>(listings: T[]): T[] {
  const withIds = listings.map((l, index) => ({
    ...l,
    id: l.id ?? `temp-${index}`,
  }))
  const titles = buildListingDisplayTitles(withIds)
  return listings.map((listing, index) => {
    if (listing.manualTitle?.trim()) {
      return { ...listing, title: listing.manualTitle.trim() }
    }
    const id = listing.id ?? `temp-${index}`
    const title = titles.get(id) ?? buildBaseListingTitle(listing)
    return { ...listing, title: title }
  })
}

/** Merge generated title into listing data; respects manualTitle. */
export function syncListingTituloInData<T extends ListingTitleInput & { title: string }>(
  listing: T,
  titlesMap: Map<string, string>
): T {
  if (listing.manualTitle?.trim()) {
    return { ...listing, title: listing.manualTitle.trim() }
  }
  const id = listing.id
  if (id && titlesMap.has(id)) {
    return { ...listing, title: titlesMap.get(id)! }
  }
  return { ...listing, title: buildBaseListingTitle(listing) }
}

export function syncCollectionListingTitulos<
  T extends ListingTitleInput & { title: string },
>(listings: T[]): T[] {
  const titles = buildListingDisplayTitles(listings)
  return listings.map((l) => syncListingTituloInData(l, titles))
}

export function collectionNeedsTitleSync(
  listings: ListingTitleInput[]
): boolean {
  const titles = buildListingDisplayTitles(listings)
  return listings.some((listing) => {
    if (listing.manualTitle?.trim()) return false
    const id = listing.id
    if (!id) return false
    const expected = titles.get(id)
    return Boolean(expected && listing.title !== expected)
  })
}

/** Title for a new listing before insert, using current collection for disambiguation. */
export function prepareListingDataForCreate<
  T extends ListingTitleInput & { title: string },
>(data: T, existing: ListingTitleInput[]): T {
  if (data.manualTitle?.trim()) {
    return { ...data, title: data.manualTitle.trim() }
  }
  const batch = [
    ...existing.map((l, index) => ({
      ...l,
      id: l.id ?? `existing-${index}`,
    })),
    { ...data, id: "__new__", createdAt: new Date().toISOString() },
  ]
  const titled = applyGeneratedTitlesToListingData(batch)
  const title = titled[titled.length - 1]?.title ?? buildBaseListingTitle(data)
  return { ...data, title: title }
}
