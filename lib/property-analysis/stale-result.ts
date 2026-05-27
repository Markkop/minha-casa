import type { ListingAnalysisResult } from "./types"
import {
  isListingAnalysisV6,
  LISTING_ANALYSIS_SCHEMA_VERSION,
} from "./types"

/** True when the saved result is not v6 (pre-redesign or missing API config). */
export function isStaleConfigResult(result: ListingAnalysisResult | null): boolean {
  if (!result) return false
  if (result.schemaVersion !== LISTING_ANALYSIS_SCHEMA_VERSION) return true
  return !isListingAnalysisV6(result)
}

export function isLegacyAnalysisResult(result: ListingAnalysisResult | null): boolean {
  if (!result) return false
  return result.schemaVersion !== LISTING_ANALYSIS_SCHEMA_VERSION
}
