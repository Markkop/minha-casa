export const PORTALS = [
  "zap",
  "vivareal",
  "olx",
  "chavesnamao",
  "imovelweb",
] as const

export type Portal = (typeof PORTALS)[number]

export const PORTAL_LABELS: Record<Portal, string> = {
  zap: "Zap Imóveis",
  vivareal: "Viva Real",
  olx: "OLX Imóveis",
  chavesnamao: "Chaves na Mão",
  imovelweb: "ImovelWeb",
}

export const TRANSACOES = ["venda", "aluguel"] as const
export type Transacao = (typeof TRANSACOES)[number]

export const TIPOS_IMOVEL = [
  "apartamento",
  "casa",
  "sobrado",
  "cobertura",
  "kitnet",
  "studio",
  "loft",
  "flat",
  "casa_condominio",
  "terreno",
  "sala_comercial",
  "galpao",
  "chacara",
  "sitio",
  "fazenda",
] as const

export type TipoImovel = (typeof TIPOS_IMOVEL)[number]

export const AMENIDADES = [
  "piscina",
  "churrasqueira",
  "academia",
  "sacada",
  "varanda_gourmet",
  "mobiliado",
  "portaria_24h",
  "elevador",
  "salao_de_festas",
  "playground",
  "quadra",
  "sauna",
  "seguranca_24h",
  "aceita_pets",
  "ar_condicionado",
  "armarios_cozinha",
  "armarios_quarto",
  "proximo_metro",
] as const

export type Amenidade = (typeof AMENIDADES)[number]

export const ESTAGIOS = ["pronto", "em_construcao", "na_planta", "lancamento"] as const
export type Estagio = (typeof ESTAGIOS)[number]

export interface FilterSet {
  transacao: Transacao
  uf: string
  cidade: string
  bairros: string[]
  tiposImovel: TipoImovel[]
  quartos: number[]
  banheiros: number[]
  vagas: number[]
  suites: number[]
  precoMin: number | null
  precoMax: number | null
  areaMin: number | null
  areaMax: number | null
  condominioMax: number | null
  amenidades: Amenidade[]
  estagio: Estagio[]
}

export const DEFAULT_FILTER_SET: FilterSet = {
  transacao: "venda",
  uf: "sp",
  cidade: "sao-paulo",
  bairros: [],
  tiposImovel: ["apartamento"],
  quartos: [],
  banheiros: [],
  vagas: [],
  suites: [],
  precoMin: null,
  precoMax: null,
  areaMin: null,
  areaMax: null,
  condominioMax: null,
  amenidades: [],
  estagio: [],
}

export interface UrlBuildResult {
  urls: string[]
  notes: string[]
}

export type CacheOrigin = "fresh" | "page_cache" | "listing_cache"

export interface ShortListing {
  id: string
  portal: Portal
  sourceUrl: string
  title: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
  tipoImovel: string | null
  quartos: number | null
  banheiros: number | null
  vagas: number | null
  suites: number | null
  areaTotal: number | null
  areaPrivada: number | null
  preco: number | null
  precoCondominio: number | null
  precoM2: number | null
  amenidades: string[]
  thumbnailUrl: string | null
  postedAt: string | null
  rank?: number | null
  cacheOrigin?: CacheOrigin | null
}

export interface PortalSearchRun {
  id: string
  portalSearchId: string
  status: "queued" | "running" | "completed" | "failed"
  startedAt: string | null
  finishedAt: string | null
  error: string | null
  totals: Record<string, unknown> | null
  traceId?: string | null
}

export interface PortalSearch {
  id: string
  name: string
  filterSet: FilterSet
  enabledPortals: Portal[]
  maxPages: number
  lastRunId: string | null
  createdAt: string
  updatedAt: string
}

export type MatrixAxis =
  | "quartos"
  | "banheiros"
  | "vagas"
  | "bairro"
  | "tipo_imovel"
  | "portal"
  | "suites"
  | "area_bucket"
  | "preco_bucket"

export type MatrixMetric =
  | "median_preco_m2"
  | "avg_preco_m2"
  | "count"
  | "min_preco_m2"
  | "max_preco_m2"
  | "median_preco"
