const STORAGE_KEY = "pendingTgLinkCode"

export function savePendingTgLinkCode(code: string): void {
  if (typeof window === "undefined") return
  sessionStorage.setItem(STORAGE_KEY, code.trim().toUpperCase())
}

export function getPendingTgLinkCode(): string | null {
  if (typeof window === "undefined") return null
  const value = sessionStorage.getItem(STORAGE_KEY)
  return value?.trim() || null
}

export function clearPendingTgLinkCode(): void {
  if (typeof window === "undefined") return
  sessionStorage.removeItem(STORAGE_KEY)
}

export function resolveTgLinkCode(urlCode: string | null | undefined): string | null {
  const fromUrl = urlCode?.trim()
  if (fromUrl) return fromUrl.toUpperCase()
  return getPendingTgLinkCode()
}
