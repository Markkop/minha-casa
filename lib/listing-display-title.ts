/**
 * Deterministic listing titles (post-parse). Collection-scoped disambiguation.
 */

export type ListingTitleInput = {
  id?: string
  titulo?: string
  tituloManual?: string | null
  tipoImovel?: "casa" | "apartamento" | null
  quartos?: number | null
  bairro?: string | null
  cidade?: string | null
  endereco?: string
  preco?: number | null
  m2Totais?: number | null
  andar?: number | null
  condominiumName?: string | null
}

const STREET_PREFIX_PATTERN =
  /^(?:rua|r\.|av\.?|avenida|alameda|al\.?|travessa|trav\.?|rodovia|estrada|servidão|servidao|praça|praca|largo)\s+/i

const STREET_TOKEN_PATTERN =
  /\b(rua|av\.?|avenida|alameda|travessa|rodovia|estrada|servidão|servidao|praça|praca|largo)\b/i

export const LISTING_TITLE_REGEN_FIELDS = [
  "tipoImovel",
  "quartos",
  "bairro",
  "cidade",
  "endereco",
  "preco",
  "m2Totais",
  "andar",
  "condominiumName",
  "tituloManual",
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

export function extractStreetLabelTwoWords(endereco: string): string | null {
  const trimmed = endereco?.trim()
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

export function extractAddressNumber(endereco: string): string | null {
  const trimmed = endereco?.trim()
  if (!trimmed) return null
  const match = trimmed.match(/\b(\d{1,5})\b/)
  return match?.[1] ?? null
}

function propertyTypeLabel(tipoImovel: ListingTitleInput["tipoImovel"]): string {
  if (tipoImovel === "casa") return "Casa"
  if (tipoImovel === "apartamento") return "Apartamento"
  return "Imóvel"
}

function quartosPhrase(quartos: number | null | undefined): string | null {
  if (quartos == null || quartos < 0) return null
  if (quartos === 1) return "um quarto"
  return `${quartos} quartos`
}

/** Casa/Apartamento prefix when building collection titles. */
export function collectionShowsPropertyTypePrefix(
  listings: ListingTitleInput[]
): boolean {
  if (listings.length <= 1) return true
  const hasCasa = listings.some((l) => l.tipoImovel === "casa")
  const hasApto = listings.some((l) => l.tipoImovel === "apartamento")
  return hasCasa && hasApto
}

type BuildListingTitleOptions = {
  showPropertyTypePrefix?: boolean
  locationPreposition?: "em" | "na"
}

export type LocationLevel =
  | "bairro"
  | "cidade"
  | "rua"
  | "numero"
  | "condominio"
  | "preco"
  | "m2"
  | "andar"
  | "id"

function locationAtLevel(
  listing: ListingTitleInput,
  level: LocationLevel
): string | null {
  const endereco = listing.endereco?.trim() ?? ""

  switch (level) {
    case "bairro": {
      const bairro = listing.bairro?.trim()
      if (bairro) return normalizeLocationLabel(bairro)
      return null
    }
    case "cidade": {
      const cidade = listing.cidade?.trim()
      if (cidade) return normalizeLocationLabel(cidade)
      return null
    }
    case "rua":
      if (isPlaceholderEndereco(endereco)) return null
      return extractStreetLabelTwoWords(endereco)
    case "numero": {
      const street = extractStreetLabelTwoWords(endereco)
      const number = extractAddressNumber(endereco)
      if (street && number) return `${street}, ${number}`
      if (number) return `nº ${number}`
      return null
    }
    case "condominio": {
      const name = listing.condominiumName?.trim()
      if (name) return normalizeLocationLabel(name)
      return null
    }
    case "preco":
      return formatCompactPrice(listing.preco)
    case "m2":
      if (listing.m2Totais != null && listing.m2Totais > 0) {
        return `${listing.m2Totais} m²`
      }
      return null
    case "andar":
      if (listing.tipoImovel === "apartamento" && (listing.andar ?? 0) > 0) {
        return listing.andar === 10 ? "andar 10+" : `andar ${listing.andar}`
      }
      return null
    case "id":
      if (listing.id) return listing.id.slice(-4)
      return null
    default:
      return null
  }
}

function isPlaceholderEndereco(endereco: string | undefined): boolean {
  const trimmed = endereco?.trim().toLowerCase() ?? ""
  return trimmed === "" || trimmed === "endereço não informado"
}

function defaultLocationLabel(listing: ListingTitleInput): string {
  const street =
    !isPlaceholderEndereco(listing.endereco) ? locationAtLevel(listing, "rua") : null
  return (
    locationAtLevel(listing, "bairro") ??
    locationAtLevel(listing, "cidade") ??
    street ??
    "Sem local"
  )
}

function formatCompactPrice(preco: number | null | undefined): string | null {
  if (preco == null || preco <= 0) return null
  if (preco >= 1_000_000) {
    const millions = preco / 1_000_000
    const rounded =
      millions >= 10
        ? Math.round(millions)
        : Math.round(millions * 10) / 10
    const formatted = String(rounded).replace(".", ",")
    return `R$ ${formatted} mi`
  }
  if (preco >= 1_000) {
    const thousands = Math.round(preco / 1_000)
    return `R$ ${thousands} mil`
  }
  return `R$ ${preco}`
}

export function buildBaseListingTitle(
  listing: ListingTitleInput,
  locationLabel?: string,
  options?: BuildListingTitleOptions
): string {
  const showPrefix = options?.showPropertyTypePrefix ?? true
  const prep = options?.locationPreposition ?? "em"
  const tipo = propertyTypeLabel(listing.tipoImovel)
  const quartos = quartosPhrase(listing.quartos)
  const local = locationLabel ?? defaultLocationLabel(listing)
  const locationPart = `${prep} ${local}`

  if (quartos) {
    if (showPrefix) {
      return `${tipo} com ${quartos} ${locationPart}`
    }
    return `${quartos} ${locationPart}`
  }
  if (showPrefix) {
    return `${tipo} ${locationPart}`
  }
  return local
}

function collisionKey(listing: ListingTitleInput, locationLabel: string): string {
  const tipo = listing.tipoImovel ?? ""
  const quartos = listing.quartos ?? ""
  return `${tipo}|${quartos}|${normalizeKey(locationLabel)}`
}

function streetGroupKey(listing: ListingTitleInput): string | null {
  const street = locationAtLevel(listing, "rua")
  return street ? normalizeKey(street) : null
}

const ESCALATION_LEVELS: LocationLevel[] = [
  "rua",
  "numero",
  "condominio",
  "preco",
  "m2",
  "andar",
  "id",
]

/** Extra disambiguation when multiple listings share a street (no bairro in title). */
const SAME_STREET_ESCALATION_LEVELS: LocationLevel[] = [
  "condominio",
  "preco",
  "m2",
  "andar",
  "id",
]

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
  listing: Pick<ListingTitleInput, "tipoImovel" | "quartos">
): string {
  const tipo = propertyTypeLabel(listing.tipoImovel)
  const quartos = listing.quartos

  if (quartos == null || quartos < 0) {
    return tipo
  }

  const quartosLabel = quartos === 1 ? "1 quarto" : `${quartos} quartos`
  return `${tipo} ${quartosLabel}`
}

/** Breadcrumb on narrow screens — compact title without the trailing " em …" location. */
export function mobileCompactListingDisplayTitle(title: string): string {
  const compact = compactListingDisplayTitle(title)
  const match = compact.match(LISTING_TITLE_LOCATION_SUFFIX_PATTERN)
  if (!match || match.index == null) return compact
  return compact.slice(0, match.index).trim()
}

function buildSameStreetTitle(
  listing: ListingTitleInput,
  escalationIndex: number,
  showPropertyTypePrefix: boolean
): string {
  const base =
    locationAtLevel(listing, "numero") ??
    locationAtLevel(listing, "rua") ??
    defaultLocationLabel(listing)

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
  showPropertyTypePrefix: boolean
): string {
  const titleOptions = { showPropertyTypePrefix }

  if (escalationIndex <= 0) {
    return buildBaseListingTitle(listing, baseLocation, {
      ...titleOptions,
      locationPreposition: "em",
    })
  }

  const street = locationAtLevel(listing, "rua")
  if (street) {
    const extras: string[] = []
    for (let i = 1; i < escalationIndex && i < ESCALATION_LEVELS.length; i++) {
      const extra = locationAtLevel(listing, ESCALATION_LEVELS[i]!)
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
  for (let i = 0; i < escalationIndex && i < ESCALATION_LEVELS.length; i++) {
    const extra = locationAtLevel(listing, ESCALATION_LEVELS[i]!)
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
  listings: ListingTitleInput[]
): Map<string, string> {
  const result = new Map<string, string>()
  const showPropertyTypePrefix = collectionShowsPropertyTypePrefix(listings)
  const autoListings = listings.filter((l) => !l.tituloManual?.trim())

  const baseLocations = new Map<string, string>()
  for (const listing of autoListings) {
    const id = listing.id ?? ""
    baseLocations.set(id, defaultLocationLabel(listing))
  }

  const streetGroups = new Map<string, ListingTitleInput[]>()
  for (const listing of autoListings) {
    const key = streetGroupKey(listing)
    if (!key) continue
    const group = streetGroups.get(key) ?? []
    group.push(listing)
    streetGroups.set(key, group)
  }

  const sameStreetIds = new Set<string>()

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

    const titles = assignUniqueTitles(
      pending,
      showPropertyTypePrefix,
      1,
      ESCALATION_LEVELS.length,
      (listing, escalation) => {
        const baseLoc = baseLocations.get(listing.id ?? "") ?? "Sem local"
        return buildTitleWithEscalation(
          listing,
          baseLoc,
          escalation,
          showPropertyTypePrefix
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
    if (listing.tituloManual?.trim()) {
      result.set(id, listing.tituloManual.trim())
    } else if (!result.has(id) && id) {
      result.set(id, buildBaseListingTitle(listing))
    }
  }

  return result
}

export function resolveListingDisplayTitle(
  listing: ListingTitleInput,
  titlesMap?: Map<string, string>
): string {
  if (listing.tituloManual?.trim()) {
    return listing.tituloManual.trim()
  }
  if (listing.id && titlesMap?.has(listing.id)) {
    return titlesMap.get(listing.id)!
  }
  return buildBaseListingTitle(listing)
}

/** Apply generated titles to listing data objects (pre-import, no ids yet). */
export function applyGeneratedTitlesToListingData<
  T extends ListingTitleInput & { titulo?: string },
>(listings: T[]): T[] {
  const withIds = listings.map((l, index) => ({
    ...l,
    id: l.id ?? `temp-${index}`,
  }))
  const titles = buildListingDisplayTitles(withIds)
  return listings.map((listing, index) => {
    if (listing.tituloManual?.trim()) {
      return { ...listing, titulo: listing.tituloManual.trim() }
    }
    const id = listing.id ?? `temp-${index}`
    const title = titles.get(id) ?? buildBaseListingTitle(listing)
    return { ...listing, titulo: title }
  })
}

/** Merge generated titulo into listing data; respects tituloManual. */
export function syncListingTituloInData<T extends ListingTitleInput & { titulo: string }>(
  listing: T,
  titlesMap: Map<string, string>
): T {
  if (listing.tituloManual?.trim()) {
    return { ...listing, titulo: listing.tituloManual.trim() }
  }
  const id = listing.id
  if (id && titlesMap.has(id)) {
    return { ...listing, titulo: titlesMap.get(id)! }
  }
  return { ...listing, titulo: buildBaseListingTitle(listing) }
}

export function syncCollectionListingTitulos<
  T extends ListingTitleInput & { titulo: string },
>(listings: T[]): T[] {
  const titles = buildListingDisplayTitles(listings)
  return listings.map((l) => syncListingTituloInData(l, titles))
}

export function collectionNeedsTitleSync(
  listings: ListingTitleInput[]
): boolean {
  const titles = buildListingDisplayTitles(listings)
  return listings.some((listing) => {
    if (listing.tituloManual?.trim()) return false
    const id = listing.id
    if (!id) return false
    const expected = titles.get(id)
    return Boolean(expected && listing.titulo !== expected)
  })
}

/** Title for a new listing before insert, using current collection for disambiguation. */
export function prepareListingDataForCreate<
  T extends ListingTitleInput & { titulo: string },
>(data: T, existing: ListingTitleInput[]): T {
  if (data.tituloManual?.trim()) {
    return { ...data, titulo: data.tituloManual.trim() }
  }
  const batch = [
    ...existing.map((l, index) => ({
      ...l,
      id: l.id ?? `existing-${index}`,
    })),
    { ...data, id: "__new__" },
  ]
  const titled = applyGeneratedTitlesToListingData(batch)
  const title = titled[titled.length - 1]?.titulo ?? buildBaseListingTitle(data)
  return { ...data, titulo: title }
}
