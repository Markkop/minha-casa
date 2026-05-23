/**
 * Server-side helpers for Phoenix listing image ingestion API.
 */

import { backendHeaders, getBackendApiUrl, getInternalApiSecret } from "@/lib/backend-api"

export async function enqueueListingImageIngestionOnBackend(
  listingId: string,
  userId: string,
  orgId?: string | null,
  options?: { overwrite?: boolean }
): Promise<void> {
  const backendUrl = getBackendApiUrl()
  if (!backendUrl) return

  const headers = backendHeaders(userId, orgId)
  const body = JSON.stringify({ overwrite: options?.overwrite ?? false })

  try {
    const response = await fetch(
      `${backendUrl}/api/listings/${listingId}/ingest-images`,
      {
        method: "POST",
        headers,
        body,
      }
    )

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      console.warn("[listing-images] enqueue failed", {
        listingId,
        status: response.status,
        body: text.slice(0, 200),
      })
    }
  } catch (error) {
    console.warn("[listing-images] enqueue error", { listingId, error })
  }
}

export async function fetchListingImageFromBackend(
  listingId: string,
  index: number,
  userId?: string | null,
  orgId?: string | null
): Promise<Response | null> {
  const backendUrl = getBackendApiUrl()
  if (!backendUrl) return null

  const headers: Record<string, string> = {}
  const secret = getInternalApiSecret()
  if (secret) {
    headers.Authorization = `Bearer ${secret}`
  }
  if (userId) {
    headers["x-minha-casa-user-id"] = userId
  }
  if (orgId) {
    headers["x-minha-casa-org-id"] = orgId
  }

  return fetch(`${backendUrl}/api/listings/${listingId}/images/${index}`, {
    headers,
    cache: "no-store",
  })
}
