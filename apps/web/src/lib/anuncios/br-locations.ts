// ============================================================================
// BRAZIL LOCATIONS (IBGE) — states + municipalities for map location picker
// ============================================================================

export interface BrState {
  id: number
  sigla: string
  nome: string
}

export interface BrCity {
  id: number
  nome: string
  stateSigla: string
  stateName: string
  label: string
}

export type BrLocationResult =
  | { type: "state"; state: BrState }
  | { type: "city"; city: BrCity }

export interface BrLocationSearchResult {
  states: BrState[]
  cities: BrCity[]
}

const IBGE_STATES_URL =
  "https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome"
const IBGE_MUNICIPIOS_URL =
  "https://servicodados.ibge.gov.br/api/v1/localidades/municipios"
const CACHE_KEY = "br-locations-cache-v1"

interface IbgeUf {
  id: number
  sigla: string
  nome: string
}

interface IbgeMunicipio {
  id: number
  nome: string
  microrregiao?: {
    mesorregiao?: {
      UF?: IbgeUf
    }
  }
}

export interface BrLocationsCache {
  states: BrState[]
  cities: BrCity[]
}

let memoryCache: BrLocationsCache | null = null

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function parseIbgeMunicipio(item: IbgeMunicipio): BrCity | null {
  const uf = item.microrregiao?.mesorregiao?.UF
  if (!uf?.sigla || !uf.nome) return null
  return {
    id: item.id,
    nome: item.nome,
    stateSigla: uf.sigla,
    stateName: uf.nome,
    label: `${item.nome} — ${uf.sigla}`,
  }
}

function getSessionCache(): BrLocationsCache | null {
  if (typeof window === "undefined") return null
  const raw = sessionStorage.getItem(CACHE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as BrLocationsCache
  } catch {
    return null
  }
}

function setSessionCache(data: BrLocationsCache): void {
  if (typeof window === "undefined") return
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(data))
}

async function fetchBrLocations(): Promise<BrLocationsCache> {
  if (memoryCache) return memoryCache

  const session = getSessionCache()
  if (session) {
    memoryCache = session
    return session
  }

  const [statesRes, municipiosRes] = await Promise.all([
    fetch(IBGE_STATES_URL),
    fetch(IBGE_MUNICIPIOS_URL),
  ])

  if (!statesRes.ok || !municipiosRes.ok) {
    throw new Error("Falha ao carregar localidades do IBGE")
  }

  const statesJson = (await statesRes.json()) as IbgeUf[]
  const municipiosJson = (await municipiosRes.json()) as IbgeMunicipio[]

  const states: BrState[] = statesJson.map((s) => ({
    id: s.id,
    sigla: s.sigla,
    nome: s.nome,
  }))

  const cities: BrCity[] = municipiosJson
    .map(parseIbgeMunicipio)
    .filter((c): c is BrCity => c !== null)

  const data = { states, cities }
  memoryCache = data
  setSessionCache(data)
  return data
}

export async function loadBrLocations(): Promise<BrLocationsCache> {
  return fetchBrLocations()
}

export function searchBrLocations(
  data: BrLocationsCache,
  query: string,
  limit = 12
): BrLocationSearchResult {
  const q = normalizeText(query)
  if (!q) {
    return { states: [], cities: [] }
  }

  const states = data.states
    .filter(
      (s) =>
        normalizeText(s.nome).includes(q) || normalizeText(s.sigla).includes(q)
    )
    .slice(0, Math.min(5, limit))

  const remaining = Math.max(0, limit - states.length)
  const cities = data.cities
    .filter((c) => normalizeText(c.nome).includes(q) || normalizeText(c.label).includes(q))
    .slice(0, remaining)

  return { states, cities }
}

export function formatLocationInputValue(result: BrLocationResult): string {
  if (result.type === "state") {
    return result.state.nome
  }
  return result.city.label
}
