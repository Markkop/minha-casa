const STORAGE_KEY = "pendingWaLinkCode"

export function savePendingWaLinkCode(code: string): void {
  if (typeof window === "undefined") return
  sessionStorage.setItem(STORAGE_KEY, code.trim().toUpperCase())
}

export function getPendingWaLinkCode(): string | null {
  if (typeof window === "undefined") return null
  const value = sessionStorage.getItem(STORAGE_KEY)
  return value?.trim() || null
}

export function clearPendingWaLinkCode(): void {
  if (typeof window === "undefined") return
  sessionStorage.removeItem(STORAGE_KEY)
}

export function resolveWaLinkCode(urlCode: string | null | undefined): string | null {
  const fromUrl = urlCode?.trim()
  if (fromUrl) return fromUrl.toUpperCase()
  return getPendingWaLinkCode()
}
