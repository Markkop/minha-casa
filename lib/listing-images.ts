/**
 * Normalizes listing image fields (backward compat: imageUrl-only → imageUrls).
 */
export function resolveListingImages(data: {
  imageUrl?: string | null
  imageUrls?: string[] | null
}): { imageUrls: string[]; imageUrl: string | null } {
  const fromList = (data.imageUrls ?? []).filter(
    (url): url is string => typeof url === "string" && url.trim() !== ""
  )
  if (fromList.length > 0) {
    return { imageUrls: fromList, imageUrl: fromList[0] ?? null }
  }
  if (data.imageUrl?.trim()) {
    return { imageUrls: [data.imageUrl.trim()], imageUrl: data.imageUrl.trim() }
  }
  return { imageUrls: [], imageUrl: null }
}

/**
 * Syncs imageUrl to the first gallery entry when saving.
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
