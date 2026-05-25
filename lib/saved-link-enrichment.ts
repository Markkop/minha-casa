/**
 * Local/dev enrichment implementation. Production BFF proxies to Phoenix
 * (`MinhaCasaAi.Integrations.SavedLinkMetadata`). Scripts under `scripts/` may still import this module.
 */
import OpenAI from "openai"
import {
  extractPageMetadataFromHtml,
  scrapeUrlPage,
  type PageMetadata,
} from "@/lib/scrapingant"
import { validatePublicHttpUrl } from "@/lib/url-validation"

export const SAVED_LINK_TITLE_MAX = 60
export const SAVED_LINK_DESCRIPTION_MAX = 200
export const ENRICHMENT_TIMEOUT_MS = 52_000

const DIRECT_FETCH_TIMEOUT_MS = 10_000
const SCRAPE_TEXT_MAX = 1200
const LOCATION_INFERENCE_TEXT_MAX = 16_000
const FETCH_TEXT_MAX = 600

const DIRECT_FETCH_USER_AGENT =
  "Mozilla/5.0 (compatible; MinhaCasa/1.0; +https://minhacasa.app)"

const BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search"

const BOILERPLATE_DESCRIPTION_PATTERNS = [
  /web site created using create-react-app/i,
  /you need to enable javascript/i,
]

const ORDEM_LABELS: Record<string, string> = {
  LOWEST_PRICE: "menor preço",
  HIGHEST_PRICE: "maior preço",
  MOST_RECENT: "mais recentes",
  RELEVANCE: "relevância",
}

export type EnrichmentPath = "fetch+brave" | "scrapingant" | "fallback"

export interface DeconstructedUrl {
  hostname: string
  pathname: string
  pathSegments: string[]
  queryParams: Record<string, string>
  hints: {
    siteLabel: string | null
    listingType: string | null
    regionPath: string | null
    neighborhood: string | null
    city: string | null
    locationLabel: string | null
    quartos: string | null
    ordem: string | null
    mapRegion: string | null
    priceRange: string | null
  }
}

export interface DirectFetchSnapshot {
  ok: boolean
  blocked: boolean
  status: number
  titleTag: string | null
  metaDescription: string | null
  ogTitle: string | null
  ogDescription: string | null
  textSample: string | null
  meta: PageMetadata
}

export interface BraveSearchHit {
  title: string
  url: string
  description: string | null
  extra_snippets: string[]
}

export interface ScrapingAntSnapshot {
  sourceUrl: string
  title: string | null
  description: string | null
  textSample: string | null
  /** Longer excerpt used only to infer bairro from listing cards */
  locationInferenceText: string | null
  mapListingHint: string | null
}

export interface ResolvedLinkMetadata {
  title: string
  description: string | null
  path: EnrichmentPath
  braveQuery?: string
}

/** @deprecated Use ResolvedLinkMetadata */
export type EnrichedSavedLink = ResolvedLinkMetadata

export function fallbackTitleFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "")
    return hostname || url
  } catch {
    return url
  }
}

export function isBoilerplateDescription(text: string | null | undefined): boolean {
  if (!text?.trim()) return true
  return BOILERPLATE_DESCRIPTION_PATTERNS.some((p) => p.test(text))
}

function sanitizeDescription(text: string | null | undefined): string | null {
  if (!text?.trim() || isBoilerplateDescription(text)) return null
  const trimmed = text.trim()
  if (trimmed.length <= SAVED_LINK_DESCRIPTION_MAX) return trimmed
  return `${trimmed.slice(0, SAVED_LINK_DESCRIPTION_MAX - 1)}…`
}

/** Strips common marketing fluff from model output. */
function tightenAiDescription(text: string): string {
  return text
    .replace(/\s+à venda/gi, "")
    .replace(/\s+residenciais/gi, "")
    .replace(/,?\s*com diversas ofertas[^.]*$/i, "")
    .replace(/,?\s*disponíveis no portal[^.]*$/i, "")
    .replace(/,?\s*no portal\s+[\w\s]+\.?$/i, "")
    .replace(/com preço máximo de/gi, "até")
    .replace(/\s{2,}/g, " ")
    .trim()
}

function stripHtmlText(html: string, maxLen: number): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (text.length > maxLen) text = `${text.slice(0, maxLen)}…`
  return text
}

function isBlockedPage(title: string | null, text: string | null): boolean {
  const blob = `${title ?? ""} ${text ?? ""}`.toLowerCase()
  return (
    blob.includes("cloudflare") ||
    blob.includes("attention required") ||
    blob.includes("you have been blocked")
  )
}

function parseViewportCenter(viewport: string): { lat: number; lng: number } | null {
  const parts = viewport.split("|").map((p) => p.split(",").map(Number))
  if (parts.length < 1 || parts[0].length < 2) return null
  const [lng1, lat1] = parts[0]
  if (parts.length >= 2 && parts[1].length >= 2) {
    const [lng2, lat2] = parts[1]
    return { lat: (lat1 + lat2) / 2, lng: (lng1 + lng2) / 2 }
  }
  return { lat: lat1, lng: lng1 }
}

export function regionHintFromViewport(viewport: string): string | null {
  const center = parseViewportCenter(viewport)
  if (!center) return null
  const { lat, lng } = center
  if (lat >= -27.85 && lat <= -26.95 && lng >= -49.0 && lng <= -48.2) {
    return "Florianópolis"
  }
  if (lat >= -27.1 && lat <= -26.7 && lng >= -48.9 && lng <= -48.4) {
    return "Grande Florianópolis"
  }
  if (lat >= -23.8 && lat <= -23.2 && lng >= -46.8 && lng <= -46.2) {
    return "São Paulo"
  }
  if (lat >= -23.1 && lat <= -22.7 && lng >= -43.4 && lng <= -42.9) {
    return "Rio de Janeiro"
  }
  return null
}

function parseMoneyHint(value: string): number | null {
  const digits = value.replace(/[^\d]/g, "")
  if (!digits) return null
  const n = Number.parseInt(digits, 10)
  return Number.isFinite(n) ? n : null
}

function formatPriceShort(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000
    return m % 1 === 0 ? `R$${m}M` : `R$${m.toFixed(1)}M`
  }
  if (value >= 1_000) {
    const k = value / 1_000
    return k % 1 === 0 ? `R$${k}k` : `R$${k.toFixed(0)}k`
  }
  return `R$${value}`
}

const CITY_SLUG_LABELS: Record<string, string> = {
  florianopolis: "Florianópolis",
  "sao-paulo": "São Paulo",
  "rio-de-janeiro": "Rio de Janeiro",
  "santa-catarina": "Santa Catarina",
}

function slugToCityLabel(slug: string): string | null {
  const key = slug
    .toLowerCase()
    .replace(/\+.*$/, "")
    .replace(/-sc$/i, "")
    .split("-")
    .find((part) => CITY_SLUG_LABELS[part] || part.includes("florianopolis"))
  if (!key) return null
  if (CITY_SLUG_LABELS[key]) return CITY_SLUG_LABELS[key]
  if (key.includes("florianopolis")) return "Florianópolis"
  if (key.includes("sao-paulo")) return "São Paulo"
  if (key.includes("rio-de-janeiro")) return "Rio de Janeiro"
  return null
}

function capitalizeLocationToken(name: string): string {
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
}

function extractCityFromPath(pathSegments: string[]): string | null {
  for (const seg of pathSegments) {
    for (const part of seg.split("+")) {
      const label = slugToCityLabel(part)
      if (label && label !== "Santa Catarina" && label !== "Brasil") return label
    }
  }
  return null
}

function extractNeighborhoodFromQuery(
  queryParams: Record<string, string>
): string | null {
  const keys = ["bairro", "neighborhood", "neighborhoods", "localizacao", "onde"]
  for (const key of keys) {
    const val = queryParams[key]
    if (!val?.trim()) continue
    const clean = decodeURIComponent(val).split(",")[0]?.trim()
    if (clean && clean.length > 2) return clean.toLowerCase()
  }
  return null
}

/** Common bairros — Florianópolis e região (matched in listing result text). */
const FLORIANOPOLIS_AREA_NEIGHBORHOODS = [
  "itacorubi",
  "trindade",
  "centro",
  "agronomica",
  "pantanal",
  "coqueiros",
  "estreito",
  "capoeiras",
  "ingleses",
  "canasvieiras",
  "jurere",
  "campeche",
  "armacao",
  "barra da lagoa",
  "lagoa da conceicao",
  "carvoeira",
  "abraao",
  "saco dos limoes",
  "morro das pedras",
  "cacupe",
  "sambaqui",
  "vargem pequena",
  "vargem grande",
  "rios acima",
  "kobrasol",
  "campinas",
  "forquilhinhas",
  "areias",
  "pagessi",
  "ponte do imaruim",
  "rio tavares",
  "ribeirao da ilha",
  "pantano do sul",
  "costeira do pirajubaem",
  "tapera",
  "balneario",
]

const LOCATION_INFERENCE_STOPWORDS = new Set([
  "sc",
  "brasil",
  "santa catarina",
  "venda",
  "aluguel",
  "casa",
  "casas",
  "apartamento",
  "apartamentos",
  "imovel",
  "imoveis",
  "quartos",
  "dormitorios",
  "banheiros",
  "vagas",
  "florianopolis",
  "florianópolis",
  "grande florianopolis",
  "sao jose",
  "são jose",
  "palhoca",
  "palhoça",
])

export function inferNeighborhoodFromResultTexts(
  chunks: string[],
  city: string | null
): string | null {
  const text = chunks.filter(Boolean).join(" ").toLowerCase()
  if (text.length < 80) return null

  const scores = new Map<string, number>()
  const bump = (raw: string, weight: number) => {
    const key = raw.trim().toLowerCase()
    if (key.length < 3 || LOCATION_INFERENCE_STOPWORDS.has(key)) return
    scores.set(key, (scores.get(key) ?? 0) + weight)
  }

  for (const slug of FLORIANOPOLIS_AREA_NEIGHBORHOODS) {
    const re = new RegExp(`\\b${slug.replace(/\s+/g, "\\s+")}\\b`, "gi")
    const count = (text.match(re) ?? []).length
    if (count > 0) bump(slug, count * 2)
  }

  const cityMarkers = [
    city?.toLowerCase(),
    "florianópolis",
    "florianopolis",
    "são josé",
    "sao jose",
    "palhoça",
    "palhoca",
  ].filter(Boolean) as string[]

  for (const marker of cityMarkers) {
    const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const re = new RegExp(
      `[,·|]\\s*([a-zà-ú][a-zà-ú\\s]{2,32})\\s*[,·]\\s*${escaped}`,
      "gi"
    )
    let match: RegExpExecArray | null
    while ((match = re.exec(text)) !== null) {
      bump(match[1], 1)
    }
  }

  let best: string | null = null
  let bestScore = 0
  for (const [name, score] of scores) {
    if (score >= 2 && score > bestScore) {
      bestScore = score
      best = capitalizeLocationToken(name)
    }
  }
  return best
}

export function buildLocationLabel(hints: DeconstructedUrl["hints"]): string | null {
  const city =
    hints.city ??
    hints.mapRegion ??
    (hints.regionPath && hints.regionPath !== "brasil"
      ? slugToCityLabel(hints.regionPath)
      : null)
  const neighborhood = hints.neighborhood
    ? capitalizeLocationToken(hints.neighborhood)
    : null

  if (neighborhood && city) return `${neighborhood}, ${city}`
  if (neighborhood) return neighborhood
  return city
}

function extractNeighborhoodFromPath(pathSegments: string[]): string | null {
  for (const seg of pathSegments) {
    const plusParts = seg.split("+").filter(Boolean)
    if (plusParts.length >= 2) {
      const last = plusParts[plusParts.length - 1].replace(/-sc$/i, "")
      const chunks = last.split("-").filter(Boolean)
      if (chunks.length >= 2) {
        const neighborhood = chunks[chunks.length - 1]
        if (neighborhood.length > 2) return neighborhood
      }
      const name = last.replace(/-/g, " ").trim()
      if (name && name.length > 2) return name
    }
  }
  return null
}

export function deconstructUrl(rawUrl: string): DeconstructedUrl {
  const u = new URL(rawUrl)
  const pathSegments = u.pathname.split("/").filter(Boolean)
  const queryParams = Object.fromEntries(u.searchParams.entries())

  const hostParts = u.hostname
    .replace(/^www\./, "")
    .split(".")
    .filter((p) => !["br", "com", "org", "gov", "edu", "net"].includes(p))

  let siteLabel: string | null = hostParts[0] ?? null
  if (siteLabel === "pmf" && hostParts.includes("geoportal")) {
    siteLabel = "geoportal pmf"
  } else if (siteLabel === "vivareal") {
    siteLabel = "vivareal"
  } else if (siteLabel === "dagaimoveis") {
    siteLabel = "daga imoveis"
  }

  let listingType: string | null = null
  if (
    pathSegments.some((s) => s.includes("apartamento")) ||
    queryParams.tipos?.includes("apartamento")
  ) {
    listingType = "apartamentos"
  } else if (
    pathSegments.some((s) => s.includes("casa")) ||
    queryParams.tipos?.includes("casa") ||
    queryParams["by_type_or_subtype_slug[0]"]?.includes("casa")
  ) {
    listingType = "casas"
  }

  const regionPath =
    pathSegments.find((s) =>
      ["brasil", "florianopolis", "sao-paulo", "rio-de-janeiro", "santa-catarina"].includes(
        s.replace(/\+.*$/, "")
      )
    )?.replace(/\+.*$/, "") ?? null

  const neighborhood =
    extractNeighborhoodFromPath(pathSegments) ??
    extractNeighborhoodFromQuery(queryParams)

  const city =
    (queryParams.viewport ? regionHintFromViewport(queryParams.viewport) : null) ??
    extractCityFromPath(pathSegments) ??
    (regionPath ? slugToCityLabel(regionPath) : null)

  let quartos: string | null = null
  if (queryParams.quartos) {
    const q = queryParams.quartos.replace(/,/g, "-")
    quartos = `${q} quartos`
  }

  const ordem = queryParams.ordem
    ? (ORDEM_LABELS[queryParams.ordem.toUpperCase()] ?? queryParams.ordem.toLowerCase())
    : null

  const mapRegion = queryParams.viewport
    ? regionHintFromViewport(queryParams.viewport)
    : null

  const hintsBase = {
    siteLabel,
    listingType,
    regionPath,
    neighborhood,
    city,
    locationLabel: null as string | null,
    quartos: null as string | null,
    ordem: null as string | null,
    mapRegion,
    priceRange: null as string | null,
  }

  let priceRange: string | null = null
  const minRaw =
    queryParams.minValue ??
    queryParams.precoMinimo ??
    queryParams.preco_minimo
  const maxRaw =
    queryParams.maxValue ??
    queryParams.precoMaximo ??
    queryParams.preco_maximo
  const min = minRaw ? parseMoneyHint(minRaw) : null
  const max = maxRaw ? parseMoneyHint(maxRaw) : null
  if (min != null && max != null) {
    priceRange = `${formatPriceShort(min)}–${formatPriceShort(max)}`
  } else if (max != null) {
    priceRange = `até ${formatPriceShort(max)}`
  } else if (min != null) {
    priceRange = `a partir de ${formatPriceShort(min)}`
  }

  hintsBase.quartos = quartos
  hintsBase.ordem = ordem
  hintsBase.priceRange = priceRange
  hintsBase.locationLabel = buildLocationLabel(hintsBase)

  return {
    hostname: u.hostname,
    pathname: u.pathname,
    pathSegments,
    queryParams,
    hints: hintsBase,
  }
}

export function buildBraveQueryFromUrl(deconstructed: DeconstructedUrl): string {
  const words: string[] = []

  if (deconstructed.hints.siteLabel) words.push(deconstructed.hints.siteLabel)
  if (deconstructed.hints.listingType) words.push(deconstructed.hints.listingType)
  if (deconstructed.pathSegments.includes("venda") || deconstructed.pathSegments.includes("comprar")) {
    words.push("venda")
  }
  if (deconstructed.hints.neighborhood) words.push(deconstructed.hints.neighborhood)
  if (deconstructed.hints.mapRegion) words.push(deconstructed.hints.mapRegion)
  else if (deconstructed.hints.city) words.push(deconstructed.hints.city)
  else if (deconstructed.hints.regionPath && deconstructed.hints.regionPath !== "brasil") {
    words.push(deconstructed.hints.regionPath.replace(/-/g, " "))
  } else if (deconstructed.hostname.includes("pmf")) {
    words.push("prefeitura florianópolis")
  }
  if (deconstructed.hints.quartos) words.push(deconstructed.hints.quartos)
  if (deconstructed.hints.ordem) words.push(deconstructed.hints.ordem)
  if (deconstructed.pathSegments.includes("map")) words.push("mapa")

  const unique = [...new Set(words.filter(Boolean))]
  return unique.slice(0, 12).join(" ") || deconstructed.hostname.replace(/^www\./, "")
}

export async function directFetchSnapshot(url: string): Promise<DirectFetchSnapshot> {
  const empty: DirectFetchSnapshot = {
    ok: false,
    blocked: false,
    status: 0,
    titleTag: null,
    metaDescription: null,
    ogTitle: null,
    ogDescription: null,
    textSample: null,
    meta: {},
  }

  let parsed: URL
  try {
    parsed = validatePublicHttpUrl(url)
  } catch {
    return empty
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DIRECT_FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(parsed.toString(), {
      method: "GET",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": DIRECT_FETCH_USER_AGENT,
      },
      redirect: "follow",
      signal: controller.signal,
    })

    const html = await response.text()
    const meta = extractPageMetadataFromHtml(html)
    const titleTag = meta.title ?? null
    const textSample = stripHtmlText(html, FETCH_TEXT_MAX) || null
    const blocked = isBlockedPage(titleTag, textSample)

    return {
      ok: response.ok && !blocked,
      blocked,
      status: response.status,
      titleTag,
      metaDescription: meta.description ?? null,
      ogTitle: meta.title ?? null,
      ogDescription: meta.description ?? null,
      textSample,
      meta,
    }
  } catch {
    return empty
  } finally {
    clearTimeout(timeout)
  }
}

export function directFetchSucceeded(snapshot: DirectFetchSnapshot): boolean {
  return snapshot.ok && !snapshot.blocked
}

function extractMapListingHint(text: string): string | null {
  const m = text.match(/(\d+)\s+imóveis na área do mapa/i)
  if (m) return `${m[1]} imóveis na área do mapa`
  if (/área do mapa/i.test(text)) return "busca na área do mapa"
  return null
}

export async function scrapingAntSnapshot(
  url: string
): Promise<ScrapingAntSnapshot | null> {
  try {
    const scraped = await scrapeUrlPage(url)
    const meta = extractPageMetadataFromHtml(scraped.html)
    const textSample = scraped.text.replace(/\s+/g, " ").trim()
    const excerpt =
      textSample.length > SCRAPE_TEXT_MAX
        ? `${textSample.slice(0, SCRAPE_TEXT_MAX)}…`
        : textSample

    const locationInferenceText =
      textSample.length > LOCATION_INFERENCE_TEXT_MAX
        ? textSample.slice(0, LOCATION_INFERENCE_TEXT_MAX)
        : textSample

    return {
      sourceUrl: scraped.sourceUrl,
      title: meta.title ?? null,
      description: sanitizeDescription(meta.description),
      textSample: excerpt || null,
      locationInferenceText: locationInferenceText || null,
      mapListingHint: extractMapListingHint(scraped.text),
    }
  } catch (error) {
    console.warn("[saved-link-enrichment] ScrapingAnt failed:", error)
    return null
  }
}

export async function braveSearch(query: string): Promise<BraveSearchHit[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY?.trim()
  if (!apiKey) {
    console.warn("[saved-link-enrichment] BRAVE_SEARCH_API_KEY missing")
    return []
  }

  const params = new URLSearchParams({
    q: query,
    count: "5",
    country: "BR",
    search_lang: "pt-br",
    extra_snippets: "true",
  })

  try {
    const res = await fetch(`${BRAVE_SEARCH_URL}?${params}`, {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": apiKey,
      },
    })
    const data = (await res.json()) as {
      web?: { results?: Array<Record<string, unknown>> }
      error?: { detail?: string }
    }
    if (!res.ok || data.error) {
      console.warn("[saved-link-enrichment] Brave failed:", data.error?.detail)
      return []
    }
    return (data.web?.results ?? []).slice(0, 5).map((r) => ({
      title: String(r.title ?? ""),
      url: String(r.url ?? ""),
      description: r.description ? String(r.description) : null,
      extra_snippets: Array.isArray(r.extra_snippets)
        ? r.extra_snippets.map(String).slice(0, 3)
        : [],
    }))
  } catch (error) {
    console.warn("[saved-link-enrichment] Brave network error:", error)
    return []
  }
}

function pickBraveFallback(
  hostname: string,
  results: BraveSearchHit[]
): { title: string | null; description: string | null } {
  const hostRoot = hostname.replace(/^www\./, "")
  for (const hit of results) {
    try {
      const hitHost = new URL(hit.url).hostname.replace(/^www\./, "")
      if (hitHost !== hostRoot && !hitHost.endsWith(`.${hostRoot}`)) continue
    } catch {
      continue
    }
    const desc = sanitizeDescription(hit.description)
    if (desc) return { title: hit.title || null, description: desc }
  }
  for (const hit of results) {
    const desc = sanitizeDescription(hit.description)
    if (desc && !isBoilerplateDescription(desc)) {
      return { title: hit.title || null, description: desc }
    }
  }
  return { title: null, description: null }
}

function locationHintFromDeconstructed(deconstructed: DeconstructedUrl): string | null {
  return deconstructed.hints.locationLabel ?? buildLocationLabel(deconstructed.hints)
}

function descriptionFromHints(deconstructed: DeconstructedUrl): string | null {
  const { hints } = deconstructed
  if (
    !hints.listingType &&
    !hints.quartos &&
    !hints.priceRange &&
    !hints.ordem &&
    !hints.locationLabel
  ) {
    return null
  }

  let desc = `Busca de ${hints.listingType ?? "imóveis"}`
  if (hints.quartos) desc += ` com ${hints.quartos}`
  if (hints.locationLabel) desc += ` em ${hints.locationLabel}`

  if (hints.priceRange) {
    desc += hints.priceRange.startsWith("até") || hints.priceRange.startsWith("a partir")
      ? ` ${hints.priceRange}`
      : `, ${hints.priceRange}`
  }
  if (hints.ordem) desc += `, ${hints.ordem}`

  return sanitizeDescription(desc)
}

interface PipelineState {
  url: string
  deconstructed: DeconstructedUrl
  path: EnrichmentPath
  fetchSnap: DirectFetchSnapshot
  scrapeSnap: ScrapingAntSnapshot | null
  braveQuery: string | null
  braveResults: BraveSearchHit[]
}

function pickFallbackMetadata(state: PipelineState): ResolvedLinkMetadata {
  const { url, deconstructed, fetchSnap, scrapeSnap, braveResults, path, braveQuery } =
    state

  const fetchDesc = sanitizeDescription(fetchSnap.metaDescription)
  const fetchTitle = fetchSnap.titleTag?.trim() || null

  if (fetchTitle || fetchDesc) {
    return {
      title: fetchTitle ?? fallbackTitleFromUrl(url),
      description: fetchDesc,
      path,
      braveQuery: braveQuery ?? undefined,
    }
  }

  if (scrapeSnap) {
    const scrapeDesc =
      sanitizeDescription(scrapeSnap.description) ??
      (scrapeSnap.mapListingHint ? scrapeSnap.mapListingHint : null)
    return {
      title: scrapeSnap.title ?? fallbackTitleFromUrl(url),
      description: scrapeDesc,
      path,
      braveQuery: braveQuery ?? undefined,
    }
  }

  const brave = pickBraveFallback(deconstructed.hostname, braveResults)
  if (brave.title || brave.description) {
    return {
      title: brave.title ?? fallbackTitleFromUrl(url),
      description: brave.description,
      path,
      braveQuery: braveQuery ?? undefined,
    }
  }

  return {
    title: fallbackTitleFromUrl(url),
    description: descriptionFromHints(deconstructed),
    path: "fallback",
    braveQuery: braveQuery ?? undefined,
  }
}

const FINAL_METADATA_SYSTEM = `Você gera título e descrição curtos para links salvos em pesquisa de imóveis no Brasil.
Use só o JSON de contexto (URL decomposta, fetch, Brave ou ScrapingAnt). Não invente filtros nem cidades que não estejam no contexto.

FORMATO PADRÃO DO TÍTULO (máx. ${SAVED_LINK_TITLE_MAX} caracteres):
- Portal/busca imobiliária: "{Marca} - {tipo resumido} {filtro principal} em {bairro, cidade ou só cidade}"
  Use hints.locationLabel: bairro+cidade quando existir (ex. "Itacorubi, Florianópolis"), senão só cidade/região.
  Ex.: "VivaReal - Aptos 3-4 quartos Itacorubi, Florianópolis"
  Ex.: "VivaReal - Aptos 3-4 quartos em Florianópolis"
- Site utilitário / governo / mapa: "{Nome do serviço} {Cidade} - {função curta}"
  Ex.: "Geoportal Florianópolis - Mapa interativo"
- Marca com capitalização correta (VivaReal, Geoportal, Daga Imóveis). Pode usar "Aptos" para apartamentos.
- No máximo um hífen separando marca/nome do restante. Sem URL.

FORMATO PADRÃO DA DESCRIÇÃO (máx. ${SAVED_LINK_DESCRIPTION_MAX}, alvo 45–95 caracteres — prefira o mais curto possível):
- Uma frase só, nominal, telegráfica. NÃO encha até o limite de caracteres; quanto mais curta e densa, melhor.
- Sem verbos imperativos ("acesse", "encontre", "consulte", "veja", "clique").
- Padrão portal: "Busca de {tipo} com {filtros} em {lugar} {preço/ordem opcional}."
  Localização: use hints.locationLabel (bairro + cidade da URL). Se inferredFromListingResults.neighborhood existir, use com a cidade — inferido dos endereços no scrape da listagem.
  Não omita bairro/região quando estiverem no contexto.
  BOM: "Busca de casas com 4 quartos em Itacorubi, Florianópolis até R$3 milhões."
  BOM: "Busca de aptos 3-4 quartos em Florianópolis, menor preço."
  RUIM: "Busca de casas à venda em Itacorubi, Florianópolis, com diversas ofertas disponíveis no portal VivaReal."
  RUIM: "Busca de casas residenciais com 4 quartos em Florianópolis, com preço máximo de R$ 3 milhões."
- Inclua filtros relevantes de deconstructed.hints (tipo, quartos, locationLabel, preço, ordenação) de forma compacta.
- Preço: "até R$3 milhões" ou "R$1–3 mi" — nunca "com preço máximo de".
- PROIBIDO na descrição: nome do portal/marca (já está no título), "à venda", "residenciais", "diversas ofertas", "disponíveis", "portal", marketing de snippets.
- Utilitário/mapa: função + cidade em poucas palavras. Ex.: "Mapa interativo urbanístico da PMF Florianópolis."
- Omita parâmetros técnicos (viewport, IDs). Não copie slogans Brave/scrape.

Responda APENAS JSON: { "title": string, "description": string | null }`

async function generateMetadataWithAi(
  payload: Record<string, unknown>
): Promise<{ title: string; description: string | null } | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) return null

  try {
    const openai = new OpenAI({ apiKey })
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: FINAL_METADATA_SYSTEM },
        { role: "user", content: JSON.stringify(payload, null, 2) },
      ],
      temperature: 0.2,
      max_tokens: 400,
      response_format: { type: "json_object" },
    })

    const content = response.choices[0]?.message?.content
    if (!content) return null

    const parsed = JSON.parse(content) as {
      title?: unknown
      description?: unknown
    }
    const title =
      typeof parsed.title === "string" ? parsed.title.trim() : ""
    if (!title) return null

    const description =
      typeof parsed.description === "string" && parsed.description.trim()
        ? sanitizeDescription(tightenAiDescription(parsed.description.trim()))
        : null

    return { title, description }
  } catch (error) {
    console.warn("[saved-link-enrichment] AI metadata failed:", error)
    return null
  }
}

function scrapeTextsForLocationInference(
  scrapeSnap: ScrapingAntSnapshot
): string[] {
  if (scrapeSnap.locationInferenceText) {
    return [scrapeSnap.locationInferenceText]
  }
  if (scrapeSnap.textSample) return [scrapeSnap.textSample]
  return []
}

function applyInferredLocation(state: PipelineState): DeconstructedUrl {
  if (state.deconstructed.hints.neighborhood) return state.deconstructed

  // Sem scrape (ex.: fetch+brave): localização só via URL (viewport, bairro na query, path).
  if (!state.scrapeSnap) return state.deconstructed

  const inferred = inferNeighborhoodFromResultTexts(
    scrapeTextsForLocationInference(state.scrapeSnap),
    state.deconstructed.hints.city
  )
  if (!inferred) return state.deconstructed

  const hints = {
    ...state.deconstructed.hints,
    neighborhood: inferred,
  }
  hints.locationLabel = buildLocationLabel(hints)
  return { ...state.deconstructed, hints }
}

async function runPipeline(state: PipelineState): Promise<void> {
  const { url, deconstructed, fetchSnap } = state

  if (directFetchSucceeded(fetchSnap)) {
    state.path = "fetch+brave"
    state.braveQuery = buildBraveQueryFromUrl(deconstructed)
    state.braveResults = await braveSearch(state.braveQuery)
    return
  }

  state.scrapeSnap = await scrapingAntSnapshot(url)
  state.path = "scrapingant"
}

/**
 * Resolves title and description for a URL. Always returns usable values.
 */
export async function resolveSavedLinkMetadata(
  url: string
): Promise<ResolvedLinkMetadata> {
  const trimmedUrl = url.trim()
  const deconstructedInitial = deconstructUrl(trimmedUrl)
  const fetchSnap = await directFetchSnapshot(trimmedUrl)

  const state: PipelineState = {
    url: trimmedUrl,
    deconstructed: deconstructedInitial,
    path: "fallback",
    fetchSnap,
    scrapeSnap: null,
    braveQuery: null,
    braveResults: [],
  }

  let timedOut = false
  const timeoutId = setTimeout(() => {
    timedOut = true
  }, ENRICHMENT_TIMEOUT_MS)

  try {
    await runPipeline(state)
  } catch (error) {
    console.warn("[saved-link-enrichment] pipeline error:", error)
  } finally {
    clearTimeout(timeoutId)
  }

  if (timedOut) {
    console.warn("[saved-link-enrichment] enrichment timed out, using fallbacks")
  }

  state.deconstructed = applyInferredLocation(state)
  const deconstructed = state.deconstructed

  const aiPayload: Record<string, unknown> = {
    enrichmentPath: state.path,
    url: trimmedUrl,
    deconstructed,
    directFetch: state.fetchSnap,
    timedOut,
  }
  if (
    deconstructed.hints.neighborhood &&
    !deconstructedInitial.hints.neighborhood
  ) {
    aiPayload.inferredFromListingResults = {
      neighborhood: deconstructed.hints.neighborhood,
      locationLabel: deconstructed.hints.locationLabel,
    }
  }
  if (state.braveQuery) {
    aiPayload.braveQuery = state.braveQuery
    aiPayload.braveResults = state.braveResults
  }
  if (state.scrapeSnap) {
    aiPayload.scrapingAnt = state.scrapeSnap
  }

  const ai = await generateMetadataWithAi(aiPayload)
  if (ai) {
    return {
      title: ai.title,
      description: ai.description,
      path: state.path,
      braveQuery: state.braveQuery ?? undefined,
    }
  }

  return pickFallbackMetadata(state)
}

/** Alias used by enrich endpoint */
export async function enrichSavedLinkFromUrl(
  url: string
): Promise<ResolvedLinkMetadata> {
  return resolveSavedLinkMetadata(url)
}
