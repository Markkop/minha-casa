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
}

const STREET_PREFIX_PATTERN =
  /^(?:rua|r\.|av\.?|avenida|alameda|al\.?|travessa|trav\.?|rodovia|estrada|servidão|servidao|praça|praca|largo)\s+/i

const STREET_TOKEN_PATTERN =
  /\b(rua|av\.?|avenida|alameda|travessa|rodovia|estrada|servidão|servidao|praça|praca|largo)\b/i

export const LISTING_TITLE_REGEN_FIELDS = [
  "propertyType",
  "bedrooms",
  "neighborhood",
  "city",
  "address",
  "price",
  "totalAreaM2",
  "floor",
  "condominiumName",
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

  const words = rest
    .replace(/[,.;]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0 && !/^\d+$/.test(w))

  if (words.length === 0) return null
  if (words.length === 1) return normalizeLocationLabel(words[0]!)
  return normalizeLocationLabel(`${words[0]} ${words[1]}`)
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

function quartosPhrase(bedrooms: number | null | undefined): string | null {
  if (bedrooms == null || bedrooms < 0) return null
  if (bedrooms === 1) return "um quarto"
  return `${bedrooms} bedrooms`
}

/** Casa/Apartamento prefix when building collection titles. */
export function collectionShowsPropertyTypePrefix(
  listings: ListingTitleInput[]
): boolean {
  if (listings.length <= 1) return true
  const hasCasa = listings.some((l) => l.propertyType === "house")
  const hasApto = listings.some((l) => l.propertyType === "apartment")
  return hasCasa && hasApto
}

type BuildListingTitleOptions = {
  showPropertyTypePrefix?: boolean
  locationPreposition?: "em" | "na"
}

export type LocationLevel =
  | "neighborhood"
  | "city"
  | "rua"
  | "numero"
  | "condominio"
  | "price"
  | "m2"
  | "floor"
  | "id"

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
    case "numero": {
      const street = extractStreetLabelTwoWords(address)
      const number = extractAddressNumber(address)
      if (street && number) return `${street}, ${number}`
      if (number) return `nº ${number}`
      return null
    }
    case "condominio": {
      const name = listing.condominiumName?.trim()
      if (name) return normalizeLocationLabel(name)
      return null
    }
    case "price":
      return formatCompactPrice(listing.price)
    case "m2":
      if (listing.totalAreaM2 != null && listing.totalAreaM2 > 0) {
        return `${listing.totalAreaM2} m²`
      }
      return null
    case "floor":
      if (listing.propertyType === "apartment" && (listing.floor ?? 0) > 0) {
        return listing.floor === 10 ? "floor 10+" : `floor ${listing.floor}`
      }
      return null
    case "id":
      if (listing.id) return listing.id.slice(-4)
      return null
    default:
      return null
  }
}

function isPlaceholderEndereco(address: string | undefined): boolean {
  const trimmed = address?.trim().toLowerCase() ?? ""
  return trimmed === "" || trimmed === "endereço não informado"
}

function defaultLocationLabel(
  listing: ListingTitleInput,
  options?: ListingDisplayTitleOptions
): string {
  const neighborhood = locationAtLevel(listing, "neighborhood")
  const city = locationAtLevel(listing, "city")
  if (options?.excludeStreet) {
    return neighborhood ?? city ?? "Sem local"
  }
  const street =
    !isPlaceholderEndereco(listing.address) ? locationAtLevel(listing, "rua") : null
  return neighborhood ?? city ?? street ?? "Sem local"
}

function formatCompactPrice(price: number | null | undefined): string | null {
  if (price == null || price <= 0) return null
  if (price >= 1_000_000) {
    const millions = price / 1_000_000
    const rounded =
      millions >= 10
        ? Math.round(millions)
        : Math.round(millions * 10) / 10
    const formatted = String(rounded).replace(".", ",")
    return `R$ ${formatted} mi`
  }
  if (price >= 1_000) {
    const thousands = Math.round(price / 1_000)
    return `R$ ${thousands} mil`
  }
  return `R$ ${price}`
}

export function buildBaseListingTitle(
  listing: ListingTitleInput,
  locationLabel?: string,
  options?: BuildListingTitleOptions
): string {
  const showPrefix = options?.showPropertyTypePrefix ?? true
  const prep = options?.locationPreposition ?? "em"
  const tipo = propertyTypeLabel(listing.propertyType)
  const bedrooms = quartosPhrase(listing.bedrooms)
  const local = locationLabel ?? defaultLocationLabel(listing)
  const locationPart = `${prep} ${local}`

  if (bedrooms) {
    if (showPrefix) {
      return `${tipo} com ${bedrooms} ${locationPart}`
    }
    return `${bedrooms} ${locationPart}`
  }
  if (showPrefix) {
    return `${tipo} ${locationPart}`
  }
  return local
}

function collisionKey(listing: ListingTitleInput, locationLabel: string): string {
  const tipo = listing.propertyType ?? ""
  const bedrooms = listing.bedrooms ?? ""
  return `${tipo}|${bedrooms}|${normalizeKey(locationLabel)}`
}

function streetGroupKey(listing: ListingTitleInput): string | null {
  const street = locationAtLevel(listing, "rua")
  return street ? normalizeKey(street) : null
}

const ESCALATION_LEVELS: LocationLevel[] = [
  "rua",
  "numero",
  "condominio",
  "price",
  "m2",
  "floor",
  "id",
]

/** Extra disambiguation when multiple listings share a street (no neighborhood in title). */
const SAME_STREET_ESCALATION_LEVELS: LocationLevel[] = [
  "condominio",
  "price",
  "m2",
  "floor",
  "id",
]

export type ListingDisplayTitleOptions = {
  excludeStreet?: boolean
}

export const ANUNCIOS_LISTING_TITLE_OPTIONS = {
  excludeStreet: true,
} satisfies ListingDisplayTitleOptions

function escalationLevelsFor(options?: ListingDisplayTitleOptions): LocationLevel[] {
  if (options?.excludeStreet) {
    return ESCALATION_LEVELS.filter((level) => level !== "rua" && level !== "numero")
  }
  return ESCALATION_LEVELS
}

function sameStreetBaseLocation(listing: ListingTitleInput): string {
  return (
    locationAtLevel(listing, "numero") ??
    locationAtLevel(listing, "rua") ??
    defaultLocationLabel(listing)
  )
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

const LISTING_TITLE_LOCATION_SUFFIX_PATTERN = /\s+(?:em|na)\s+.+$/i

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

/** Breadcrumb on narrow screens — compact title without the trailing " em …" location. */
export function mobileCompactListingDisplayTitle(title: string): string {
  const compact = compactListingDisplayTitle(title)
  const match = compact.match(LISTING_TITLE_LOCATION_SUFFIX_PATTERN)
  const withoutLocation =
    match && match.index != null ? compact.slice(0, match.index).trim() : compact
  return mobileListingDisplayTitle(withoutLocation)
}

function buildSameStreetTitle(
  listing: ListingTitleInput,
  escalationIndex: number,
  showPropertyTypePrefix: boolean
): string {
  const base = sameStreetBaseLocation(listing)

  const extras: string[] = []
  for (
    let i = 0;
    i < escalationIndex && i < SAME_STREET_ESCALATION_LEVELS.length;
    i++
  ) {
    const extra = locationAtLevel(listing, SAME_STREET_ESCALATION_LEVELS[i]!)
    if (extra && !extras.some((p) => normalizeKey(p) === normalizeKey(extra))) {
      extras.push(extra)
    }
  }

  const locationLabel =
    extras.length > 0
      ? [base, ...extras].join(LISTING_TITLE_DISAMBIGUATION_SEPARATOR)
      : base

  return buildBaseListingTitle(listing, locationLabel, {
    showPropertyTypePrefix,
    locationPreposition: "na",
  })
}

function buildTitleWithEscalation(
  listing: ListingTitleInput,
  baseLocation: string,
  escalationIndex: number,
  showPropertyTypePrefix: boolean,
  options?: ListingDisplayTitleOptions
): string {
  const titleOptions = { showPropertyTypePrefix }
  const escalationLevels = escalationLevelsFor(options)

  if (escalationIndex <= 0) {
    return buildBaseListingTitle(listing, baseLocation, {
      ...titleOptions,
      locationPreposition: "em",
    })
  }

  const street = options?.excludeStreet ? null : locationAtLevel(listing, "rua")
  if (street) {
    const extras: string[] = []
    for (let i = 1; i < escalationIndex && i < escalationLevels.length; i++) {
      const extra = locationAtLevel(listing, escalationLevels[i]!)
      if (extra && !extras.some((p) => normalizeKey(p) === normalizeKey(extra))) {
        extras.push(extra)
      }
    }
    const streetPart =
      extras.length > 0 ? `${street}, ${extras.join(", ")}` : street
    const locationLabel = `${streetPart} em ${baseLocation}`
    return buildBaseListingTitle(listing, locationLabel, {
      ...titleOptions,
      locationPreposition: "na",
    })
  }

  const parts: string[] = [baseLocation]
  for (let i = 0; i < escalationIndex && i < escalationLevels.length; i++) {
    const extra = locationAtLevel(listing, escalationLevels[i]!)
    if (extra && !parts.some((p) => normalizeKey(p) === normalizeKey(extra))) {
      parts.push(extra)
    }
  }

  const local =
    parts.length === 1
      ? parts[0]!
      : parts
          .filter(Boolean)
          .join(LISTING_TITLE_DISAMBIGUATION_SEPARATOR)

  return buildBaseListingTitle(listing, local, {
    ...titleOptions,
    locationPreposition: "em",
  })
}

function assignNumberedCollisionTitles(
  group: ListingTitleInput[],
  showPropertyTypePrefix: boolean,
  baseLocations: Map<string, string>
): Map<string, string> {
  const assigned = new Map<string, string>()
  const sorted = [...group].sort((a, b) => (a.id ?? "").localeCompare(b.id ?? ""))

  sorted.forEach((listing, index) => {
    const id = listing.id ?? ""
    const loc = baseLocations.get(id) ?? "Sem local"
    const base = buildBaseListingTitle(listing, loc, { showPropertyTypePrefix })
    assigned.set(id, `${base} (${index + 1})`)
  })

  return assigned
}

function assignUniqueTitles(
  group: ListingTitleInput[],
  showPropertyTypePrefix: boolean,
  minEscalation: number,
  maxEscalation: number,
  buildCandidate: (listing: ListingTitleInput, escalation: number) => string
): Map<string, string> {
  const assigned = new Map<string, string>()
  const usedTitles = new Set<string>()

  for (let escalation = minEscalation; escalation <= maxEscalation; escalation++) {
    for (const listing of group) {
      const id = listing.id ?? ""
      if (assigned.has(id)) continue

      const candidate = buildCandidate(listing, escalation)
      const norm = normalizeKey(candidate)

      if (!usedTitles.has(norm)) {
        assigned.set(id, candidate)
        usedTitles.add(norm)
      }
    }
  }

  for (const listing of group) {
    const id = listing.id ?? ""
    if (!assigned.has(id)) {
      assigned.set(id, buildCandidate(listing, maxEscalation))
    }
  }

  return assigned
}

/**
 * Build display titles for a collection, with disambiguation for colliding base keys.
 */
export function buildListingDisplayTitles(
  listings: ListingTitleInput[],
  options?: ListingDisplayTitleOptions
): Map<string, string> {
  const result = new Map<string, string>()
  const showPropertyTypePrefix = collectionShowsPropertyTypePrefix(listings)
  const autoListings = listings.filter((l) => !l.manualTitle?.trim())
  const escalationLevels = escalationLevelsFor(options)

  const baseLocations = new Map<string, string>()
  for (const listing of autoListings) {
    const id = listing.id ?? ""
    baseLocations.set(id, defaultLocationLabel(listing, options))
  }

  const sameStreetIds = new Set<string>()

  if (!options?.excludeStreet) {
    const streetGroups = new Map<string, ListingTitleInput[]>()
    for (const listing of autoListings) {
      const key = streetGroupKey(listing)
      if (!key) continue
      const group = streetGroups.get(key) ?? []
      group.push(listing)
      streetGroups.set(key, group)
    }

    for (const group of streetGroups.values()) {
      if (group.length < 2) continue

      const titles = assignUniqueTitles(
        group,
        showPropertyTypePrefix,
        0,
        SAME_STREET_ESCALATION_LEVELS.length,
        (listing, escalation) =>
          buildSameStreetTitle(listing, escalation, showPropertyTypePrefix)
      )

      for (const [id, title] of titles) {
        result.set(id, title)
        sameStreetIds.add(id)
      }
    }
  }

  const bairroGroups = new Map<string, ListingTitleInput[]>()
  for (const listing of autoListings) {
    const id = listing.id ?? ""
    const loc = baseLocations.get(id) ?? "Sem local"
    const key = collisionKey(listing, loc)
    const group = bairroGroups.get(key) ?? []
    group.push(listing)
    bairroGroups.set(key, group)
  }

  for (const [, group] of bairroGroups) {
    if (group.length === 1) {
      const listing = group[0]!
      const id = listing.id ?? ""
      if (result.has(id)) continue
      const loc = baseLocations.get(id) ?? "Sem local"
      result.set(
        id,
        buildBaseListingTitle(listing, loc, { showPropertyTypePrefix })
      )
      continue
    }

    const pending = group.filter((l) => !sameStreetIds.has(l.id ?? ""))
    if (pending.length === 0) continue

    const titles = options?.excludeStreet
      ? assignNumberedCollisionTitles(pending, showPropertyTypePrefix, baseLocations)
      : assignUniqueTitles(
          pending,
          showPropertyTypePrefix,
          1,
          escalationLevels.length,
          (listing, escalation) => {
            const baseLoc = baseLocations.get(listing.id ?? "") ?? "Sem local"
            return buildTitleWithEscalation(
              listing,
              baseLoc,
              escalation,
              showPropertyTypePrefix,
              options
            )
          }
        )

    for (const [id, title] of titles) {
      result.set(id, title)
    }
  }

  for (const listing of autoListings) {
    const id = listing.id ?? ""
    if (result.has(id)) continue
    const loc = baseLocations.get(id) ?? "Sem local"
    result.set(
      id,
      buildBaseListingTitle(listing, loc, { showPropertyTypePrefix })
    )
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

/** Property list/map titles: neighborhood only, no street name or number. */
export function buildPropertyListDisplayTitles(
  listings: ListingTitleInput[]
): Map<string, string> {
  return buildListingDisplayTitles(listings, ANUNCIOS_LISTING_TITLE_OPTIONS)
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
    { ...data, id: "__new__" },
  ]
  const titled = applyGeneratedTitlesToListingData(batch)
  const title = titled[titled.length - 1]?.title ?? buildBaseListingTitle(data)
  return { ...data, title: title }
}
