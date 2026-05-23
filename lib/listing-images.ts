/**
 * Listing image fields: hosted paths, MinIO keys, and ingestion status.
 */

export type ImageIngestionStatus =
  | "idle"
  | "pending"
  | "processing"
  | "ready"
  | "failed"

export function buildListingImagePath(listingId: string, index: number): string {
  return `/api/listings/${listingId}/images/${index}`
}

export function buildSharedListingImagePath(
  token: string,
  listingId: string,
  index: number
): string {
  return `/api/shared/${token}/listings/${listingId}/images/${index}`
}

/**
 * Resolves image URLs for a public share view (token-scoped paths).
 */
export function resolveShareListingImages(
  token: string,
  listingId: string,
  data: {
    imageUrl?: string | null
    imageUrls?: string[] | null
    imageStorageKeys?: string[] | null
  }
): { imageUrls: string[]; imageUrl: string | null } {
  const keys = (data.imageStorageKeys ?? []).filter(
    (key): key is string => typeof key === "string" && key.trim() !== ""
  )

  if (keys.length > 0) {
    const urls = keys.map((_, index) =>
      buildSharedListingImagePath(token, listingId, index)
    )
    return { imageUrls: urls, imageUrl: urls[0] ?? null }
  }

  const fromList = (data.imageUrls ?? []).filter(
    (url): url is string => typeof url === "string" && url.trim() !== ""
  )

  if (fromList.length > 0) {
    const rewritten = fromList.map((url) => {
      const match = url.match(
        new RegExp(`^/api/listings/${listingId}/images/(\\d+)$`)
      )
      if (match) {
        return buildSharedListingImagePath(token, listingId, Number(match[1]))
      }
      return url
    })
    return { imageUrls: rewritten, imageUrl: rewritten[0] ?? null }
  }

  if (data.imageUrl?.trim()) {
    const single = data.imageUrl.trim()
    const match = single.match(
      new RegExp(`^/api/listings/${listingId}/images/(\\d+)$`)
    )
    const url = match
      ? buildSharedListingImagePath(token, listingId, Number(match[1]))
      : single
    return { imageUrls: [url], imageUrl: url }
  }

  return { imageUrls: [], imageUrl: null }
}

export function isListingImageIngesting(
  status?: ImageIngestionStatus | string | null
): boolean {
  return status === "pending" || status === "processing"
}

function isLegacyExternalUrl(url: string): boolean {
  const trimmed = url.trim()
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  )
}

/**
 * Normalizes listing image fields for display.
 * Prefers hosted paths from imageStorageKeys; falls back to legacy external URLs.
 */
export function resolveListingImages(data: {
  listingId?: string
  imageUrl?: string | null
  imageUrls?: string[] | null
  imageStorageKeys?: string[] | null
}): { imageUrls: string[]; imageUrl: string | null } {
  const keys = (data.imageStorageKeys ?? []).filter(
    (key): key is string => typeof key === "string" && key.trim() !== ""
  )

  if (keys.length > 0 && data.listingId) {
    const urls = keys.map((_, index) =>
      buildListingImagePath(data.listingId!, index)
    )
    return { imageUrls: urls, imageUrl: urls[0] ?? null }
  }

  const fromList = (data.imageUrls ?? []).filter(
    (url): url is string => typeof url === "string" && url.trim() !== ""
  )
  if (fromList.length > 0) {
    return { imageUrls: fromList, imageUrl: fromList[0] ?? null }
  }
  if (data.imageUrl?.trim()) {
    return {
      imageUrls: [data.imageUrl.trim()],
      imageUrl: data.imageUrl.trim(),
    }
  }
  return { imageUrls: [], imageUrl: null }
}

/**
 * Syncs imageUrl to the first gallery entry when saving manual URL edits.
 */
export function syncListingImageFields(imageUrls: string[]): {
  imageUrls: string[]
  imageUrl: string | null
} {
  const cleaned = imageUrls
    .map((url) => url.trim())
    .filter((url) => url.length > 0)
  return {
    imageUrls: cleaned,
    imageUrl: cleaned[0] ?? null,
  }
}

/**
 * Rejects pasted external portal URLs when hosted ingestion is expected.
 */
export function isExternalListingImageUrl(url: string): boolean {
  const trimmed = url.trim()
  if (!trimmed) return false
  if (trimmed.startsWith("/api/listings/")) return false
  if (trimmed.startsWith("/api/shared/")) return false
  return isLegacyExternalUrl(trimmed)
}
