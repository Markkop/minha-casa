export type ListingAnalysisStatus = "queued" | "running" | "completed" | "failed"

export interface ListingAnalysisResult {
  schemaVersion: number
  completedSteps: string[]
  geocode?: GeocodeSection
  nearby?: NearbySection
  market?: MarketSection
  locationContext?: LocationContextSection
  inventory?: InventorySection
  spaceAudit?: SpaceAuditSection
  riskXray?: RiskXraySection
  /** @deprecated schema v1 */
  photos?: PhotosSection
  /** @deprecated schema v1 */
  viewingTips?: ViewingTipsSection
}

export interface LocationContextSection {
  summary?: string
  city?: string | null
  neighborhood?: string | null
  formattedAddress?: string | null
}

export interface InventorySection {
  images?: PhotoAnalysisItem[]
  skipped?: boolean
  reason?: string
}

export type SpaceMatchStatus =
  | "match"
  | "partial_mismatch"
  | "insufficient_photos"
  | "pending"

export interface SpaceReconciliationGap {
  type?: string
  label?: string
  note?: string | null
}

export interface SpaceAction {
  action?: "merge" | "split" | "reassign_photos" | "hide" | string
  fromSpaceId?: string | null
  toSpaceIds?: string[]
  imageIndices?: number[]
  note?: string | null
}

export interface SpaceReconciliation {
  listingSummary?: string | null
  detectedSummary?: string | null
  matchStatus?: SpaceMatchStatus
  reflections?: string[]
  missing?: SpaceReconciliationGap[]
  extra?: SpaceReconciliationGap[]
  photoCoverage?: string | null
  reason?: string | null
  spaceActions?: SpaceAction[]
}

export interface MappedSpace {
  spaceId: string
  label: string
  scene: string
  imageIndices: number[]
  listingRole?: string | null
  visible?: boolean
}

export interface SpaceAuditSection {
  spaces?: MappedSpace[]
  /** Final spaces for UI after reconciliation (schema v3) */
  displaySpaces?: MappedSpace[]
  reconciliation?: SpaceReconciliation
  skipped?: boolean
  reason?: string
  provisional?: boolean
}

export interface RiskCostEstimate {
  solution?: string | null
  costMinBrl?: number | null
  costMaxBrl?: number | null
  notes?: string | null
}

export interface BlindSpot {
  title: string
  whyCheck: string
  visitQuestion: string
  estimate?: RiskCostEstimate | null
}

export interface EnvironmentRiskXray {
  spaceId?: string
  scene: string
  label: string
  imageIndices: number[]
  listingRole?: string | null
  status?: "pending" | "running" | "completed" | "failed" | "skipped"
  inventory?: { items?: string[] }
  blindSpots?: BlindSpot[]
  agents?: {
    inventariante?: string
    engenheiroCetico?: string
    orcamentista?: string
  }
}

export interface RiskXraySection {
  environments?: EnvironmentRiskXray[]
  totals?: { costMinBrl?: number; costMaxBrl?: number }
  skipped?: boolean
  reason?: string
}

export interface GeocodeSection {
  lat?: number
  lng?: number
  formattedAddress?: string
  source?: string
  skipped?: boolean
  reason?: string
  query?: string
  hint?: string | null
  priorReason?: string
}

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
  /** @deprecated only on legacy analyses that ran nearby inside the pipeline */
  error?: string
}

export interface MarketSection {
  listingPriceM2?: number | null
  regionBenchmark?: {
    id?: string
    neighborhood?: string
    city?: string
    propertyType?: string
    pricePerM2?: number
    notes?: string | null
  } | null
  deltaPercent?: number | null
  braveSummary?: string | null
  sources?: { title: string; url: string; description?: string | null }[]
}

export interface PhotoObservation {
  scene?: string | null
  spaceHint?: string | null
  distinctivenessNotes?: string | null
  structure?: string | null
  floor?: string | null
  walls?: string | null
  ceiling?: string | null
  baseboard?: string | null
  /** Short UI chips; rich fields (floor, walls, …) feed downstream agents */
  inventoryLabels?: string[]
  openings?: string | null
  wetArea?: string | null
  wetAreaFixtures?: string | null
  /** @deprecated legacy fields from older analyses */
  windows?: string | null
  fixtures?: string | null
  conditionNotes?: string | null
  materialsSpotted?: string[]
  signalsToInvestigate?: string[]
  questionsForVisit?: string[]
}

export interface PhotoAnalysisItem {
  index: number
  url?: string | null
  spaceId?: string | null
  observations?: PhotoObservation
  error?: string
}

export interface PhotosSection {
  images?: PhotoAnalysisItem[]
  skipped?: boolean
  reason?: string
}

export interface ViewingQuestion {
  area: string
  question: string
  why: string
  expectedAnswers: string[]
  priority: "high" | "medium" | "low"
  /** 0-based listing image indices (1–3) that illustrate this question */
  imageIndices?: number[]
}

export interface ViewingTipsSection {
  questions?: ViewingQuestion[]
  fallback?: boolean
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
