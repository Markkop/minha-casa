export type ListingAnalysisStatus = "queued" | "running" | "completed" | "failed"

/** Saved analyse result contract (Hermes multi-step pipeline, schema v6). */
export const LISTING_ANALYSIS_SCHEMA_VERSION = 6 as const

export const LISTING_ANALYSIS_PIPELINE_STEPS = [
  "clima",
  "riscos",
  "mercado",
  "ambientes",
  "idade",
  "xray",
] as const

export type ListingAnalysisPipelineStep =
  (typeof LISTING_ANALYSIS_PIPELINE_STEPS)[number]

export type AmbienteCategoria =
  | "sala"
  | "cozinha"
  | "quarto"
  | "banheiro"
  | "areaServico"
  | "varanda"
  | "areaExterna"
  | "garagem"
  | "fachada"
  | "areaComum"
  | "circulacao"
  | "escritorio"
  | "closet"
  | "deposito"
  | "vista"

export const MULTI_AMBIENTE_CATEGORIES: AmbienteCategoria[] = [
  "sala",
  "quarto",
  "banheiro",
  "varanda",
  "areaComum",
  "circulacao",
  "escritorio",
]

export type AmbienteXrayStatus = "waiting" | "pending" | "done" | "failed"

export interface ClimaRange {
  minC?: number
  maxC?: number
  descricao: string
}

export interface UmidadeRange {
  minPct?: number
  maxPct?: number
  descricao: string
}

export interface ChuvaInfo {
  descricao: string
  mmAnualEstimado?: number
}

export interface ClimaSection {
  resumo: string
  temperaturas: ClimaRange
  umidade: UmidadeRange
  chuva: ChuvaInfo
  skipped?: boolean
  reason?: string
}

export interface RiscosSection {
  paragrafo: string
  tags?: string[]
  skipped?: boolean
  reason?: string
}

export interface MercadoSection {
  paragrafo: string
  precoRegiaoM2?: number
  precoSimilaresM2?: number
  precoCidadeM2?: number
  precoAnuncioM2?: number
  skipped?: boolean
  reason?: string
}

export interface IdadeSection {
  estimativaAnos?: number
  faixaAnos?: { min: number; max: number }
  resumo: string
  sinaisVistos: string[]
  skipped?: boolean
  reason?: string
}

export interface InventoryItem {
  tipo: string
  material?: string
  detalhe?: string
}

export interface PontoAtencao {
  id: string
  titulo: string
  descricao: string
  custoMinBrl: number
  custoMaxBrl: number
  detalhes?: string
}

export interface AmbienteCard {
  id: string
  categoria: AmbienteCategoria
  ordinal?: number
  rotulo: string
  imageIndices: number[]
  /** Internal / optional; not shown in UI */
  resumo?: string
  estrutura: InventoryItem[]
  instalacoes: InventoryItem[]
  moveis: InventoryItem[]
  xrayStatus?: AmbienteXrayStatus
  xrayError?: string
  pontosAtencao?: PontoAtencao[]
}

export interface AmbientesSection {
  resumoGeral: string
  cards: AmbienteCard[]
  semCategoria?: { imageIndices: number[] }
  skipped?: boolean
  reason?: string
}

export interface ListingAnalysisStepError {
  reason: string
  occurredAt: string
}

export interface ListingAnalysisResult {
  schemaVersion: typeof LISTING_ANALYSIS_SCHEMA_VERSION
  completedSteps: ListingAnalysisPipelineStep[]
  failedSteps?: ListingAnalysisPipelineStep[]
  runningSteps?: ListingAnalysisPipelineStep[]
  stepErrors?: Partial<
    Record<ListingAnalysisPipelineStep, ListingAnalysisStepError>
  >
  clima?: ClimaSection
  riscos?: RiscosSection
  mercado?: MercadoSection
  ambientes?: AmbientesSection
  idade?: IdadeSection
}

/** Proximidades (endpoint separado; não faz parte do JSON da análise profunda). */
export interface NearbyPlace {
  name: string
  rating?: number | null
  vicinity?: string | null
  distanceM?: number | null
  mapsUrl?: string | null
}

export interface NearbyCategory {
  id: string
  label: string
  places: NearbyPlace[]
}

export interface NearbySection {
  categories?: NearbyCategory[]
  skipped?: boolean
  reason?: string
  hint?: string | null
}

export interface ListingAnalysis {
  id: string
  listingId: string
  workflowRunId: string | null
  status: ListingAnalysisStatus
  input: Record<string, unknown>
  result: ListingAnalysisResult | null
  error: string | null
  insertedAt: string
  updatedAt: string
}

export function isListingAnalysisV6(
  result: ListingAnalysisResult | null | undefined
): result is ListingAnalysisResult {
  return result?.schemaVersion === LISTING_ANALYSIS_SCHEMA_VERSION
}

/** @deprecated Use isListingAnalysisV6 */
export function isListingAnalysisV5(
  result: ListingAnalysisResult | null | undefined
): boolean {
  return isListingAnalysisV6(result)
}

/** @deprecated Use isListingAnalysisV6 */
export function isListingAnalysisV4(
  result: ListingAnalysisResult | null | undefined
): boolean {
  return isListingAnalysisV6(result)
}

export function sumAmbienteXrayTotals(cards: AmbienteCard[]): {
  totalMinBrl: number
  totalMaxBrl: number
} {
  return cards.reduce(
    (acc, card) => {
      if (card.xrayStatus !== "done" || !card.pontosAtencao?.length) {
        return acc
      }
      for (const p of card.pontosAtencao) {
        acc.totalMinBrl += p.custoMinBrl ?? 0
        acc.totalMaxBrl += p.custoMaxBrl ?? 0
      }
      return acc
    },
    { totalMinBrl: 0, totalMaxBrl: 0 }
  )
}

export function hasPendingAmbienteXray(
  cards: AmbienteCard[] | undefined
): boolean {
  return (cards ?? []).some((c) => c.xrayStatus === "pending")
}
