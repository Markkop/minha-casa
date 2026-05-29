import type { DeconstructedUrl } from "@/lib/saved-link-enrichment"
import { DEFAULT_FILTER_SET, type FilterSet } from "./filter-set"
import type { Portal } from "./types"

const HOST_PORTAL: Record<string, Portal | null> = {
  "zapimoveis.com.br": "zap",
  "vivareal.com.br": "vivareal",
  "olx.com.br": "olx",
  "chavesnamao.com.br": "chavesnamao",
  "imovelweb.com.br": "imovelweb",
}

export function portalFromHostname(hostname: string): Portal | null {
  const lower = hostname.toLowerCase().replace(/^www\./, "")
  for (const [host, portal] of Object.entries(HOST_PORTAL)) {
    if (lower === host || lower.endsWith(`.${host}`)) return portal
  }
  return null
}

export function filterSetFromSavedLink(
  url: string,
  deconstructed?: DeconstructedUrl | null
): { filterSet: FilterSet; enabledPortals: Portal[] } {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { filterSet: DEFAULT_FILTER_SET, enabledPortals: [] }
  }

  const portal = portalFromHostname(parsed.hostname)
  const hints = deconstructed?.hints
  const path = parsed.pathname.toLowerCase()

  const transacao: FilterSet["transacao"] =
    path.includes("aluguel") || path.includes("para-alugar") ? "aluguel" : "venda"

  const quartos = hints?.quartos ? [parseInt(hints.quartos, 10)].filter((n) => !Number.isNaN(n)) : []

  const filterSet: FilterSet = {
    ...DEFAULT_FILTER_SET,
    transacao,
    uf: extractUf(path, hints) ?? DEFAULT_FILTER_SET.uf,
    cidade: slugify(hints?.city ?? extractCityFromPath(path) ?? DEFAULT_FILTER_SET.cidade),
    bairros: hints?.neighborhood ? [slugify(hints.neighborhood)] : [],
    quartos,
    tiposImovel: path.includes("casas") ? ["casa"] : ["apartamento"],
  }

  const params = parsed.searchParams
  const precoMax = params.get("precoMaximo") || params.get("pe")
  const precoMin = params.get("precoMinimo") || params.get("ps")
  if (precoMax) filterSet.precoMax = Number(precoMax)
  if (precoMin) filterSet.precoMin = Number(precoMin)

  return {
    filterSet,
    enabledPortals: portal ? [portal] : [],
  }
}

function extractUf(path: string, hints: DeconstructedUrl["hints"] | undefined): string | null {
  const match = path.match(/estado-([a-z]{2})/) || path.match(/\/([a-z]{2})\//)
  if (match) return match[1]
  if (hints?.mapRegion) {
    const m = hints.mapRegion.match(/\b([A-Z]{2})\b/)
    if (m) return m[1].toLowerCase()
  }
  return null
}

function extractCityFromPath(path: string): string | null {
  const segments = path.split("/").filter(Boolean)
  return segments.find((s) => s.includes("-") && !s.includes("estado")) ?? null
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
}
