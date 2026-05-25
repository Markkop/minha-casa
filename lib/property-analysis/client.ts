import type { ListingAnalysis } from "./types"

export async function fetchLatestListingAnalysis(
  listingId: string,
  orgId?: string | null
): Promise<ListingAnalysis | null> {
  const params = orgId ? `?orgId=${encodeURIComponent(orgId)}` : ""
  const res = await fetch(`/api/listings/${listingId}/analysis${params}`)
  if (res.status === 404) {
    return null
  }
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(payload.error ?? "Failed to load analysis")
  }
  const data = (await res.json()) as { analysis: ListingAnalysis | null }
  return data.analysis
}

export async function startListingAnalysis(
  listingId: string,
  options?: {
    addressOverride?: string
    orgId?: string | null
    force?: boolean
  }
): Promise<ListingAnalysis> {
  const res = await fetch(`/api/listings/${listingId}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      addressOverride: options?.addressOverride,
      orgId: options?.orgId ?? null,
      force: options?.force ?? true,
    }),
  })
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(payload.error ?? "Failed to start analysis")
  }
  const data = (await res.json()) as { analysis: ListingAnalysis }
  return data.analysis
}

export async function fetchPropertyAnalysis(
  analysisId: string,
  orgId?: string | null
): Promise<{ analysis: ListingAnalysis; workflow: unknown }> {
  const params = orgId ? `?orgId=${encodeURIComponent(orgId)}` : ""
  const res = await fetch(`/api/property-analyses/${analysisId}${params}`)
  if (!res.ok) {
    throw new Error("Failed to load analysis status")
  }
  return res.json() as Promise<{ analysis: ListingAnalysis; workflow: unknown }>
}
