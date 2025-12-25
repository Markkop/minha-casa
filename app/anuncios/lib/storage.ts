// localStorage keys
const API_KEY_STORAGE_KEY = "openai-api-key"
const LISTINGS_STORAGE_KEY = "anuncios-imoveis"

// ============================================================================
// TYPES
// ============================================================================

export interface Imovel {
  id: string
  titulo: string
  endereco: string
  m2Totais: number | null
  m2Privado: number | null
  quartos: number | null
  suites: number | null
  banheiros: number | null
  preco: number | null
  precoM2: number | null
  piscina: boolean | null
  link: string | null
  starred?: boolean
  customLat?: number | null
  customLng?: number | null
  createdAt: string
}

// ============================================================================
// API KEY STORAGE
// ============================================================================

export function getApiKey(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(API_KEY_STORAGE_KEY)
}

export function setApiKey(key: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem(API_KEY_STORAGE_KEY, key)
}

export function removeApiKey(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(API_KEY_STORAGE_KEY)
}

export function hasApiKey(): boolean {
  return !!getApiKey()
}

// ============================================================================
// LISTINGS STORAGE
// ============================================================================

export function getListings(): Imovel[] {
  if (typeof window === "undefined") return []
  const stored = localStorage.getItem(LISTINGS_STORAGE_KEY)
  if (!stored) return []
  try {
    return JSON.parse(stored) as Imovel[]
  } catch {
    return []
  }
}

export function saveListings(listings: Imovel[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(LISTINGS_STORAGE_KEY, JSON.stringify(listings))
}

export function addListing(listing: Imovel): Imovel[] {
  const listings = getListings()
  const updated = [listing, ...listings]
  saveListings(updated)
  return updated
}

export function removeListing(id: string): Imovel[] {
  const listings = getListings()
  const updated = listings.filter((l) => l.id !== id)
  saveListings(updated)
  return updated
}

export function updateListing(id: string, updates: Partial<Imovel>): Imovel[] {
  const listings = getListings()
  const updated = listings.map((listing) => {
    if (listing.id === id) {
      // Merge updates while preserving id and createdAt
      return {
        ...listing,
        ...updates,
        id: listing.id, // Ensure id cannot be changed
        createdAt: listing.createdAt, // Ensure createdAt cannot be changed
      }
    }
    return listing
  })
  saveListings(updated)
  return updated
}

export function clearListings(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(LISTINGS_STORAGE_KEY)
}

// ============================================================================
// EXPORT / IMPORT
// ============================================================================

export function exportListingsToJson(): string {
  const listings = getListings()
  return JSON.stringify(listings, null, 2)
}

export function importListingsFromJson(json: string): Imovel[] {
  try {
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed)) {
      throw new Error("Invalid format: expected array")
    }
    // Validate each item has required fields
    const validated = parsed.filter(
      (item): item is Imovel =>
        typeof item === "object" &&
        item !== null &&
        typeof item.id === "string" &&
        typeof item.titulo === "string"
    )
    saveListings(validated)
    return validated
  } catch (error) {
    console.error("Failed to import listings:", error)
    throw error
  }
}

// ============================================================================
// UTILITY
// ============================================================================

export function generateId(): string {
  return `imovel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

