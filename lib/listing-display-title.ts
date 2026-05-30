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
      if (listing.tipoImovel === "apartamento" && listing.andar != null) {
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
  locationLabel?: string
): string {
  const tipo = propertyTypeLabel(listing.tipoImovel)
  const quartos = quartosPhrase(listing.quartos)
  const local = locationLabel ?? defaultLocationLabel(listing)

  if (quartos) {
    return `${tipo} com ${quartos} em ${local}`
  }
  return `${tipo} em ${local}`
}

function collisionKey(listing: ListingTitleInput, locationLabel: string): string {
  const tipo = listing.tipoImovel ?? ""
  const quartos = listing.quartos ?? ""
  return `${tipo}|${quartos}|${normalizeKey(locationLabel)}`
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

function buildTitleWithEscalation(
  listing: ListingTitleInput,
  baseLocation: string,
  escalationIndex: number
): string {
  if (escalationIndex <= 0) {
    return buildBaseListingTitle(listing, baseLocation)
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

  return buildBaseListingTitle(listing, local)
}

/**
 * Build display titles for a collection, with disambiguation for colliding base keys.
 */
export function buildListingDisplayTitles(
  listings: ListingTitleInput[]
): Map<string, string> {
  const result = new Map<string, string>()
  const autoListings = listings.filter((l) => !l.tituloManual?.trim())

  const baseLocations = new Map<string, string>()
  for (const listing of autoListings) {
    const id = listing.id ?? ""
    baseLocations.set(id, defaultLocationLabel(listing))
  }

  const groups = new Map<string, ListingTitleInput[]>()
  for (const listing of autoListings) {
    const id = listing.id ?? ""
    const loc = baseLocations.get(id) ?? "Sem local"
    const key = collisionKey(listing, loc)
    const group = groups.get(key) ?? []
    group.push(listing)
    groups.set(key, group)
  }

  for (const [, group] of groups) {
    if (group.length === 1) {
      const listing = group[0]!
      const id = listing.id ?? ""
      const loc = baseLocations.get(id) ?? "Sem local"
      result.set(id, buildBaseListingTitle(listing, loc))
      continue
    }

    const assigned = new Map<string, string>()
    const usedTitles = new Set<string>()

    for (let escalation = 0; escalation <= ESCALATION_LEVELS.length; escalation++) {
      for (const listing of group) {
        const id = listing.id ?? ""
        if (assigned.has(id)) continue

        const baseLoc = baseLocations.get(id) ?? "Sem local"
        const candidate = buildTitleWithEscalation(listing, baseLoc, escalation)
        const norm = normalizeKey(candidate)

        if (!usedTitles.has(norm)) {
          assigned.set(id, candidate)
          usedTitles.add(norm)
        }
      }
    }

    for (const listing of group) {
      const id = listing.id ?? ""
      const baseLoc = baseLocations.get(id) ?? "Sem local"
      result.set(
        id,
        assigned.get(id) ?? buildTitleWithEscalation(listing, baseLoc, ESCALATION_LEVELS.length)
      )
    }
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
