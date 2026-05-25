import type { ListingAnalysisResult } from "./types"

/** Results saved before API keys were loaded on Phoenix. */
export function isStaleConfigResult(result: ListingAnalysisResult | null | undefined): boolean {
  if (!result) return false

  if (result.geocode?.reason === "google_not_configured") return true

  const images =
    result.inventory?.images ?? result.photos?.images ?? []
  if (
    images.length > 0 &&
    images.every(
      (img) =>
        img.error === "openai_not_configured" ||
        String(img.error ?? "").includes("openai_not_configured")
    )
  ) {
    return true
  }

  return false
}
