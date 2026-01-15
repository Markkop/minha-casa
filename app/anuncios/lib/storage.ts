// localStorage keys
const API_KEY_STORAGE_KEY = "openai-api-key"
const LISTINGS_STORAGE_KEY = "anuncios-imoveis"
const COLLECTIONS_STORAGE_KEY = "anuncios-collections"

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
  garagem: number | null
  preco: number | null
  precoM2: number | null
  piscina: boolean | null
  porteiro24h: boolean | null
  academia: boolean | null
  vistaLivre: boolean | null
  piscinaTermica: boolean | null
  andar?: number | null
  tipoImovel?: "casa" | "apartamento" | null
  link: string | null
  imageUrl?: string | null
  contactName?: string | null
  contactNumber?: string | null
  starred?: boolean
  visited?: boolean
  strikethrough?: boolean
  discardedReason?: string | null
  customLat?: number | null
  customLng?: number | null
  createdAt: string
  addedAt?: string
}

export interface Collection {
  id: string
  label: string
  createdAt: string
  updatedAt: string
  isDefault: boolean
}

export interface CollectionsData {
  version: number
  collections: Collection[]
  activeCollectionId: string | null
  listings: Record<string, Imovel[]>
}

export interface CollectionExport {
  collection: Collection
  listings: Imovel[]
}

export interface FullExport {
  version: number
  collections: CollectionExport[]
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
// LISTINGS STORAGE (Legacy compatibility - uses active collection)
// ============================================================================

export function getListings(): Imovel[] {
  return getListingsForCollection()
}

export function saveListings(listings: Imovel[]): void {
  saveListingsForCollection(listings)
}

export function addListing(listing: Imovel): Imovel[] {
  return addListingToCollection(listing)
}

export function removeListing(id: string): Imovel[] {
  return removeListingFromCollection(id)
}

export function updateListing(id: string, updates: Partial<Imovel>): Imovel[] {
  return updateListingInCollection(id, updates)
}

export function clearListings(): void {
  clearCollection()
}

// ============================================================================
// EXPORT / IMPORT (Legacy compatibility - uses active collection)
// ============================================================================

export function exportListingsToJson(): string {
  const listings = getListings()
  return JSON.stringify(listings, null, 2)
}

export function importListingsFromJson(json: string): Imovel[] {
  return importToCollection(json)
}

// ============================================================================
// UTILITY
// ============================================================================

export function generateId(): string {
  return `imovel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function generateCollectionId(): string {
  return `col-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Generates a unique collection label by appending (2), (3), etc. if needed
 */
function getUniqueCollectionLabel(desiredLabel: string, existingCollections: Collection[]): string {
  const existingLabels = new Set(existingCollections.map(c => c.label))
  
  if (!existingLabels.has(desiredLabel)) {
    return desiredLabel
  }
  
  // Extract base name (remove existing suffix like " (2)")
  const baseMatch = desiredLabel.match(/^(.+?)(?: \((\d+)\))?$/)
  const baseName = baseMatch ? baseMatch[1] : desiredLabel
  
  let counter = 2
  let newLabel = `${baseName} (${counter})`
  while (existingLabels.has(newLabel)) {
    counter++
    newLabel = `${baseName} (${counter})`
  }
  
  return newLabel
}

// ============================================================================
// COLLECTIONS STORAGE
// ============================================================================

function getCollectionsData(): CollectionsData | null {
  if (typeof window === "undefined") return null
  const stored = localStorage.getItem(COLLECTIONS_STORAGE_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored) as CollectionsData
  } catch {
    return null
  }
}

function saveCollectionsData(data: CollectionsData): void {
  if (typeof window === "undefined") return
  localStorage.setItem(COLLECTIONS_STORAGE_KEY, JSON.stringify(data))
}

function initializeCollectionsData(): CollectionsData {
  const defaultCollection: Collection = {
    id: generateCollectionId(),
    label: "Minha Colecao",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDefault: true,
  }

  return {
    version: 1,
    collections: [defaultCollection],
    activeCollectionId: defaultCollection.id,
    listings: {
      [defaultCollection.id]: [],
    },
  }
}

function migrateLegacyData(): CollectionsData {
  const legacyListings = getListings()
  const defaultCollection: Collection = {
    id: generateCollectionId(),
    label: "Minha Colecao",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDefault: true,
  }

  return {
    version: 1,
    collections: [defaultCollection],
    activeCollectionId: defaultCollection.id,
    listings: {
      [defaultCollection.id]: legacyListings,
    },
  }
}

export function ensureCollectionsData(): CollectionsData {
  // Check if collections data already exists
  const existing = getCollectionsData()
  if (existing) {
    return existing
  }

  // Check if legacy data exists and migrate it
  if (typeof window !== "undefined") {
    const legacyData = localStorage.getItem(LISTINGS_STORAGE_KEY)
    if (legacyData) {
      try {
        const parsed = JSON.parse(legacyData)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const migrated = migrateLegacyData()
          saveCollectionsData(migrated)
          return migrated
        }
      } catch {
        // If parsing fails, continue with fresh initialization
      }
    }
  }

  // Initialize fresh collections data
  const fresh = initializeCollectionsData()
  saveCollectionsData(fresh)
  return fresh
}

export function getCollections(): Collection[] {
  const data = ensureCollectionsData()
  return data.collections
}

export function getCollection(id: string): Collection | null {
  const collections = getCollections()
  return collections.find((c) => c.id === id) || null
}

export function getActiveCollection(): Collection | null {
  const data = ensureCollectionsData()
  if (!data.activeCollectionId) return null
  return getCollection(data.activeCollectionId)
}

export function setActiveCollection(id: string): void {
  const data = ensureCollectionsData()
  const collection = getCollection(id)
  if (!collection) return

  data.activeCollectionId = id
  saveCollectionsData(data)
}

export function createCollection(label: string): Collection {
  const data = ensureCollectionsData()
  const newCollection: Collection = {
    id: generateCollectionId(),
    label: label.trim() || "Nova Colecao",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDefault: false,
  }

  data.collections.push(newCollection)
  data.listings[newCollection.id] = []
  saveCollectionsData(data)

  return newCollection
}

export function updateCollection(id: string, updates: Partial<Pick<Collection, "label" | "isDefault">>): Collection | null {
  const data = ensureCollectionsData()
  const index = data.collections.findIndex((c) => c.id === id)
  if (index === -1) return null

  const collection = data.collections[index]
  const updated: Collection = {
    ...collection,
    ...updates,
    updatedAt: new Date().toISOString(),
    id: collection.id, // Ensure id cannot be changed
    createdAt: collection.createdAt, // Ensure createdAt cannot be changed
  }

  data.collections[index] = updated
  saveCollectionsData(data)

  return updated
}

export function setDefaultCollection(id: string): Collection | null {
  const data = ensureCollectionsData()
  const index = data.collections.findIndex((c) => c.id === id)
  if (index === -1) return null

  // Remove isDefault from all collections
  data.collections.forEach((c) => {
    c.isDefault = false
  })

  // Set new default
  data.collections[index].isDefault = true
  data.collections[index].updatedAt = new Date().toISOString()

  saveCollectionsData(data)
  return data.collections[index]
}

export function deleteCollection(id: string): boolean {
  const data = ensureCollectionsData()
  const collection = getCollection(id)
  if (!collection) return false

  // Prevent deleting the default collection if it's the only one
  if (collection.isDefault && data.collections.length === 1) {
    return false
  }

  // If deleting the active collection, switch to default
  if (data.activeCollectionId === id) {
    const defaultCollection = data.collections.find((c) => c.isDefault)
    if (defaultCollection) {
      data.activeCollectionId = defaultCollection.id
    } else {
      data.activeCollectionId = data.collections[0]?.id || null
    }
  }

  // Remove collection and its listings
  data.collections = data.collections.filter((c) => c.id !== id)
  delete data.listings[id]

  // If no active collection, set to first available
  if (!data.activeCollectionId && data.collections.length > 0) {
    data.activeCollectionId = data.collections[0].id
  }

  saveCollectionsData(data)
  return true
}

export function getListingsForCollection(collectionId?: string): Imovel[] {
  const data = ensureCollectionsData()
  const targetId = collectionId || data.activeCollectionId
  if (!targetId) return []
  return data.listings[targetId] || []
}

export function getAllListings(): Imovel[] {
  const data = ensureCollectionsData()
  const allListings: Imovel[] = []
  Object.values(data.listings).forEach((listings) => {
    allListings.push(...listings)
  })
  return allListings
}

export function saveListingsForCollection(listings: Imovel[], collectionId?: string): void {
  const data = ensureCollectionsData()
  const targetId = collectionId || data.activeCollectionId
  if (!targetId) return

  data.listings[targetId] = listings
  saveCollectionsData(data)
}

export function addListingToCollection(listing: Imovel, collectionId?: string): Imovel[] {
  const data = ensureCollectionsData()
  const targetId = collectionId || data.activeCollectionId
  if (!targetId) return []

  const currentListings = data.listings[targetId] || []
  const updated = [listing, ...currentListings]
  data.listings[targetId] = updated
  saveCollectionsData(data)

  return updated
}

export function removeListingFromCollection(listingId: string, collectionId?: string): Imovel[] {
  const data = ensureCollectionsData()
  const targetId = collectionId || data.activeCollectionId
  if (!targetId) return []

  const currentListings = data.listings[targetId] || []
  const updated = currentListings.filter((l) => l.id !== listingId)
  data.listings[targetId] = updated
  saveCollectionsData(data)

  return updated
}

export function updateListingInCollection(listingId: string, updates: Partial<Imovel>, collectionId?: string): Imovel[] {
  const data = ensureCollectionsData()
  const targetId = collectionId || data.activeCollectionId
  if (!targetId) return []

  const currentListings = data.listings[targetId] || []
  const updated = currentListings.map((listing) => {
    if (listing.id === listingId) {
      return {
        ...listing,
        ...updates,
        id: listing.id,
        createdAt: listing.createdAt,
      }
    }
    return listing
  })

  data.listings[targetId] = updated
  saveCollectionsData(data)

  return updated
}

export function moveListingToCollection(listingId: string, fromCollectionId: string, toCollectionId: string): void {
  const data = ensureCollectionsData()
  const fromListings = data.listings[fromCollectionId] || []
  const toListings = data.listings[toCollectionId] || []

  const listing = fromListings.find((l) => l.id === listingId)
  if (!listing) return

  // Remove from source
  data.listings[fromCollectionId] = fromListings.filter((l) => l.id !== listingId)
  // Add to target
  data.listings[toCollectionId] = [listing, ...toListings]

  saveCollectionsData(data)
}

export function copyListingToCollection(listingId: string, fromCollectionId: string, toCollectionId: string): void {
  const data = ensureCollectionsData()
  const fromListings = data.listings[fromCollectionId] || []
  const toListings = data.listings[toCollectionId] || []

  const listing = fromListings.find((l) => l.id === listingId)
  if (!listing) return

  // Create a copy with new ID
  const copy: Imovel = {
    ...listing,
    id: generateId(),
    createdAt: new Date().toISOString(),
  }

  // Add copy to target
  data.listings[toCollectionId] = [copy, ...toListings]

  saveCollectionsData(data)
}

export function clearCollection(collectionId?: string): void {
  const data = ensureCollectionsData()
  const targetId = collectionId || data.activeCollectionId
  if (!targetId) return

  data.listings[targetId] = []
  saveCollectionsData(data)
}

// ============================================================================
// COLLECTIONS EXPORT / IMPORT
// ============================================================================

export function exportCollection(collectionId?: string): string {
  const data = ensureCollectionsData()
  const targetId = collectionId || data.activeCollectionId
  if (!targetId) return JSON.stringify({ collection: null, listings: [] }, null, 2)

  const collection = getCollection(targetId)
  const listings = data.listings[targetId] || []

  const exportData: CollectionExport = {
    collection: collection!,
    listings,
  }

  return JSON.stringify(exportData, null, 2)
}

export function exportAllCollections(): string {
  const data = ensureCollectionsData()
  const collections: CollectionExport[] = data.collections.map((collection) => ({
    collection,
    listings: data.listings[collection.id] || [],
  }))

  const exportData: FullExport = {
    version: data.version,
    collections,
  }

  return JSON.stringify(exportData, null, 2)
}

export function importToCollection(json: string, collectionId?: string): Imovel[] {
  try {
    let parsed = JSON.parse(json)
    
    // Handle minified format (backwards compatibility)
    if (isMinified(parsed)) {
      // Root level is minified (CollectionExport format)
      parsed = expandKeys(parsed)
    } else if (Array.isArray(parsed) && parsed.length > 0 && isMinified(parsed[0])) {
      // Array of minified Imovel objects
      parsed = parsed.map((item) => expandKeys(item))
    }
    
    const data = ensureCollectionsData()
    const targetId = collectionId || data.activeCollectionId
    if (!targetId) throw new Error("No target collection")

    let listingsToImport: Imovel[] = []

    // Handle different import formats
    if (Array.isArray(parsed)) {
      // Legacy format: array of Imovel[]
      listingsToImport = parsed.filter(
        (item: any): item is Imovel =>
          typeof item === "object" &&
          item !== null &&
          typeof item.id === "string" &&
          typeof item.titulo === "string"
      )
    } else if (parsed.listings && Array.isArray(parsed.listings)) {
      // CollectionExport format
      listingsToImport = parsed.listings.filter(
        (item: any): item is Imovel =>
          typeof item === "object" &&
          item !== null &&
          typeof item.id === "string" &&
          typeof item.titulo === "string"
      )
    } else {
      throw new Error("Invalid format: expected array or CollectionExport object")
    }

    // Ensure all imported listings have addedAt field
    listingsToImport = listingsToImport.map((listing) => ({
      ...listing,
      addedAt: listing.addedAt || "2025-12-31",
    }))

    // Merge with existing listings (avoid duplicates by ID)
    const existing = data.listings[targetId] || []
    const existingIds = new Set(existing.map((l) => l.id))
    const newListings = listingsToImport.filter((l) => !existingIds.has(l.id))

    data.listings[targetId] = [...existing, ...newListings]
    saveCollectionsData(data)

    return data.listings[targetId]
  } catch (error) {
    console.error("Failed to import listings:", error)
    throw error
  }
}

export function importCollections(json: string): { data: CollectionsData; lastImportedCollectionId: string | null } {
  try {
    let parsed = JSON.parse(json)
    
    // Handle minified format (backwards compatibility)
    if (isMinified(parsed)) {
      // Root level is minified (CollectionExport format)
      parsed = expandKeys(parsed)
    } else if (Array.isArray(parsed) && parsed.length > 0 && isMinified(parsed[0])) {
      // Array of minified Imovel objects
      parsed = parsed.map((item) => expandKeys(item))
    }
    
    const data = ensureCollectionsData()
    let lastImportedCollectionId: string | null = null

    // Handle different import formats
    if (Array.isArray(parsed)) {
      // Legacy format: array of Imovel[]
      // Always create a new collection for imported data
      const newCollectionId = generateCollectionId()
      const uniqueLabel = getUniqueCollectionLabel("Coleção Importada", data.collections)
      
      const newCollection: Collection = {
        id: newCollectionId,
        label: uniqueLabel,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDefault: false,
      }
      
      data.collections.push(newCollection)

      const validatedListings = parsed.filter(
        (item): item is Imovel =>
          typeof item === "object" &&
          item !== null &&
          typeof item.id === "string" &&
          typeof item.titulo === "string"
      ).map((listing) => ({
        ...listing,
        addedAt: listing.addedAt || "2025-12-31",
      }))

      data.listings[newCollectionId] = validatedListings
      lastImportedCollectionId = newCollectionId
    } else if (parsed.collection && parsed.listings && Array.isArray(parsed.listings)) {
      // CollectionExport format: single collection with listings
      const collectionExport = parsed as CollectionExport
      const { collection, listings } = collectionExport

      if (!collection || !collection.label) {
        throw new Error("Invalid CollectionExport format: missing collection label")
      }

      // Always create a new collection with unique ID and label
      const newCollectionId = generateCollectionId()
      const uniqueLabel = getUniqueCollectionLabel(collection.label, data.collections)
      
      const newCollection: Collection = {
        ...collection,
        id: newCollectionId,
        label: uniqueLabel,
        updatedAt: new Date().toISOString(),
        isDefault: false, // Imported collections are never default
      }
      
      data.collections.push(newCollection)

      // Import all listings to the new collection
      const validatedListings = listings.filter(
        (item): item is Imovel =>
          typeof item === "object" &&
          item !== null &&
          typeof item.id === "string" &&
          typeof item.titulo === "string"
      ).map((listing) => ({
        ...listing,
        addedAt: listing.addedAt || "2025-12-31",
      }))
      
      data.listings[newCollectionId] = validatedListings
      lastImportedCollectionId = newCollectionId
    } else if (parsed.collections && Array.isArray(parsed.collections)) {
      // FullExport format: multiple collections
      const fullExport = parsed as FullExport

      // Import each collection
      fullExport.collections.forEach((collectionExport) => {
        const { collection, listings } = collectionExport

        if (!collection || !collection.label) {
          console.warn("Skipping invalid collection in import")
          return
        }

        // Always create a new collection with unique ID and label
        const newCollectionId = generateCollectionId()
        const uniqueLabel = getUniqueCollectionLabel(collection.label, data.collections)
        
        const newCollection: Collection = {
          ...collection,
          id: newCollectionId,
          label: uniqueLabel,
          updatedAt: new Date().toISOString(),
          isDefault: false, // Imported collections are never default
        }
        
        data.collections.push(newCollection)

        // Import all listings to the new collection
        const validatedListings = listings.filter(
          (item): item is Imovel =>
            typeof item === "object" &&
            item !== null &&
            typeof item.id === "string" &&
            typeof item.titulo === "string"
        ).map((listing) => ({
          ...listing,
          addedAt: listing.addedAt || "2025-12-31",
        }))
        
        data.listings[newCollectionId] = validatedListings
        // Track the last collection processed (for FullExport, use the last one)
        lastImportedCollectionId = newCollectionId
      })
    } else {
      throw new Error("Invalid format: expected FullExport, CollectionExport, or array of Imovel")
    }

    // Ensure at least one default collection exists
    if (!data.collections.some((c) => c.isDefault)) {
      if (data.collections.length > 0) {
        data.collections[0].isDefault = true
      } else {
        const defaultCollection = initializeCollectionsData()
        data.collections.push(defaultCollection.collections[0])
        data.listings[defaultCollection.collections[0].id] = []
      }
    }

    // Set active collection if not set
    if (!data.activeCollectionId && data.collections.length > 0) {
      const defaultCollection = data.collections.find((c) => c.isDefault) || data.collections[0]
      data.activeCollectionId = defaultCollection.id
    }

    saveCollectionsData(data)
    return { data, lastImportedCollectionId }
  } catch (error) {
    console.error("Failed to import collections:", error)
    throw error
  }
}

// ============================================================================
// COMPRESSION UTILITIES FOR URL SHARING
// ============================================================================

// Key mapping for minification: verbose keys -> short keys
const KEY_MAP: Record<string, string> = {
  collection: "c",
  listings: "l",
  id: "i",
  titulo: "t",
  endereco: "e",
  m2Totais: "mt",
  m2Privado: "mp",
  quartos: "q",
  suites: "s",
  banheiros: "b",
  garagem: "g",
  preco: "p",
  precoM2: "pm",
  piscina: "pi",
  porteiro24h: "p24",
  academia: "ac",
  vistaLivre: "vl",
  piscinaTermica: "pt",
  andar: "an",
  tipoImovel: "ti",
  link: "lk",
  imageUrl: "iu",
  contactName: "cn",
  contactNumber: "cnu",
  starred: "st",
  visited: "v",
  strikethrough: "x",
  discardedReason: "dr",
  customLat: "la",
  customLng: "lg",
  createdAt: "ca",
  addedAt: "aa",
  updatedAt: "ua",
  isDefault: "d",
  label: "lb",
}

// Reverse mapping: short keys -> verbose keys
const REVERSE_KEY_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(KEY_MAP).map(([k, v]) => [v, k])
)

/**
 * Recursively minifies object keys using KEY_MAP
 */
function minifyKeys(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => minifyKeys(item))
  }

  if (typeof obj === "object") {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      const minifiedKey = KEY_MAP[key] || key
      result[minifiedKey] = minifyKeys(value)
    }
    return result
  }

  return obj
}

/**
 * Recursively expands object keys using REVERSE_KEY_MAP
 */
function expandKeys(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => expandKeys(item))
  }

  if (typeof obj === "object") {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      const expandedKey = REVERSE_KEY_MAP[key] || key
      result[expandedKey] = expandKeys(value)
    }
    return result
  }

  return obj
}

/**
 * Checks if data uses minified keys (backwards compatibility check)
 */
function isMinified(data: unknown): boolean {
  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    // Check if root level has "c" (minified "collection") instead of "collection"
    if ("c" in data && !("collection" in data)) {
      return true
    }
    // Check if object has minified Imovel keys (e.g., "t" instead of "titulo")
    if ("t" in data && !("titulo" in data)) {
      return true
    }
  }
  return false
}

// ============================================================================
// COMPACT FORMAT UTILITIES (v2)
// ============================================================================

// Compact format version identifier
const COMPACT_FORMAT_VERSION = 2

// Ordered list of Imovel keys for array-of-arrays format
const IMOVEL_KEYS_ORDER: (keyof Imovel)[] = [
  "id",
  "titulo",
  "endereco",
  "m2Totais",
  "m2Privado",
  "quartos",
  "suites",
  "banheiros",
  "garagem",
  "preco",
  "precoM2",
  "piscina",
  "porteiro24h",
  "academia",
  "vistaLivre",
  "piscinaTermica",
  "andar",
  "tipoImovel",
  "link",
  "imageUrl",
  "contactName",
  "contactNumber",
  "starred",
  "visited",
  "strikethrough",
  "discardedReason",
  "customLat",
  "customLng",
  "createdAt",
  "addedAt",
]

// Minified keys in same order for compact export
const IMOVEL_MINIFIED_KEYS_ORDER = IMOVEL_KEYS_ORDER.map(k => KEY_MAP[k] || k)

/**
 * Compacts a date string to YYMMDD format
 * "2025-01-05T12:34:56.789Z" -> "250105"
 * "2025-01-05" -> "250105"
 */
function compactDate(dateStr: string | undefined): string | undefined {
  if (!dateStr) return undefined
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    const yy = String(date.getFullYear()).slice(2)
    const mm = String(date.getMonth() + 1).padStart(2, "0")
    const dd = String(date.getDate()).padStart(2, "0")
    return `${yy}${mm}${dd}`
  } catch {
    return dateStr
  }
}

/**
 * Expands a compact date YYMMDD to ISO date string
 * "250105" -> "2025-01-05"
 */
function expandDate(compactDate: string | undefined): string | undefined {
  if (!compactDate) return undefined
  // If already in ISO format, return as-is
  if (compactDate.includes("-") || compactDate.includes("T")) return compactDate
  // Parse YYMMDD format
  if (compactDate.length === 6) {
    const yy = compactDate.slice(0, 2)
    const mm = compactDate.slice(2, 4)
    const dd = compactDate.slice(4, 6)
    const year = parseInt(yy) < 50 ? `20${yy}` : `19${yy}`
    return `${year}-${mm}-${dd}`
  }
  return compactDate
}

/**
 * Removes null, undefined, and false values from an object
 * Converts true to 1 for booleans
 */
function omitDefaults(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined || value === false) {
      continue
    }
    if (value === true) {
      result[key] = 1
    } else {
      result[key] = value
    }
  }
  return result
}

/**
 * Restores defaults for omitted values and converts 1 back to true for booleans
 */
function restoreDefaults(obj: Record<string, unknown>, booleanKeys: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = { ...obj }
  for (const key of booleanKeys) {
    if (result[key] === 1) {
      result[key] = true
    } else if (!(key in result)) {
      result[key] = false
    }
  }
  return result
}

/**
 * Converts an Imovel to a compact array format (values only, in order)
 * Also compacts dates and omits trailing undefined values
 */
function imovelToCompactArray(imovel: Imovel): unknown[] {
  const compacted: Record<string, unknown> = {
    ...imovel,
    createdAt: compactDate(imovel.createdAt),
    addedAt: compactDate(imovel.addedAt),
  }
  
  // Convert to array in key order, omitting defaults
  const cleaned = omitDefaults(compacted)
  const arr: unknown[] = IMOVEL_KEYS_ORDER.map(key => {
    const minKey = KEY_MAP[key] || key
    return cleaned[key] !== undefined ? cleaned[key] : (cleaned[minKey] !== undefined ? cleaned[minKey] : undefined)
  })
  
  // Trim trailing undefined values
  while (arr.length > 0 && arr[arr.length - 1] === undefined) {
    arr.pop()
  }
  
  return arr
}

/**
 * Converts a compact array back to an Imovel object
 */
function compactArrayToImovel(arr: unknown[]): Imovel {
  const obj: Record<string, unknown> = {}
  const booleanKeys = ["piscina", "porteiro24h", "academia", "vistaLivre", "piscinaTermica", "starred", "visited", "strikethrough"]
  
  IMOVEL_KEYS_ORDER.forEach((key, index) => {
    if (index < arr.length && arr[index] !== undefined) {
      obj[key] = arr[index]
    }
  })
  
  // Restore boolean defaults
  const restored = restoreDefaults(obj, booleanKeys)
  
  // Expand dates
  restored.createdAt = expandDate(restored.createdAt as string) || new Date().toISOString()
  if (restored.addedAt) {
    restored.addedAt = expandDate(restored.addedAt as string)
  }
  
  // Generate ID if missing (for imports)
  if (!restored.id) {
    restored.id = generateId()
  }
  
  // Ensure required fields have defaults
  if (!restored.titulo) restored.titulo = ""
  if (!restored.endereco) restored.endereco = ""
  
  return restored as unknown as Imovel
}

/**
 * Compacts a Collection object (minimal fields + compact dates)
 */
function compactCollection(collection: Collection): Record<string, unknown> {
  return omitDefaults({
    [KEY_MAP.id]: collection.id,
    [KEY_MAP.label]: collection.label,
    [KEY_MAP.createdAt]: compactDate(collection.createdAt),
    [KEY_MAP.updatedAt]: compactDate(collection.updatedAt),
    [KEY_MAP.isDefault]: collection.isDefault,
  })
}

/**
 * Expands a compact collection back to full Collection object
 */
function expandCompactCollection(compact: Record<string, unknown>): Collection {
  return {
    id: (compact[KEY_MAP.id] || compact.id || generateCollectionId()) as string,
    label: (compact[KEY_MAP.label] || compact.label || "Imported Collection") as string,
    createdAt: expandDate(compact[KEY_MAP.createdAt] as string || compact.createdAt as string) || new Date().toISOString(),
    updatedAt: expandDate(compact[KEY_MAP.updatedAt] as string || compact.updatedAt as string) || new Date().toISOString(),
    isDefault: compact[KEY_MAP.isDefault] === 1 || compact.isDefault === true || false,
  }
}

/**
 * Compact export format structure
 */
interface CompactExport {
  _v: number // version
  c: Record<string, unknown> // collection (compact)
  l: unknown[][] // listings as array of arrays
}

/**
 * Original compression function (v1 format) - kept for backwards compatibility
 */
export function compressCollectionData(collectionId?: string): string {
  if (typeof window === "undefined") {
    throw new Error("Compression is only available in the browser")
  }

  // Dynamic import to avoid SSR issues
  const LZString = require("lz-string")
  const data = ensureCollectionsData()
  const targetId = collectionId || data.activeCollectionId
  if (!targetId) throw new Error("No collection to compress")

  const collection = getCollection(targetId)
  const listings = data.listings[targetId] || []

  const exportData: CollectionExport = {
    collection: collection!,
    listings,
  }

  // Minify keys before stringifying to reduce JSON size
  const minified = minifyKeys(exportData)
  const json = JSON.stringify(minified)
  const compressed = LZString.compressToEncodedURIComponent(json)
  return compressed
}

/**
 * Compact compression function (v2 format) - maximum compression for short URLs
 * Uses array-of-arrays format, omits nulls/defaults, and compacts dates
 */
export function compressCollectionDataCompact(collectionId?: string): string {
  if (typeof window === "undefined") {
    throw new Error("Compression is only available in the browser")
  }

  // Dynamic import to avoid SSR issues
  const LZString = require("lz-string")
  const data = ensureCollectionsData()
  const targetId = collectionId || data.activeCollectionId
  if (!targetId) throw new Error("No collection to compress")

  const collection = getCollection(targetId)
  const listings = data.listings[targetId] || []

  // Build compact export structure
  const compactExport: CompactExport = {
    _v: COMPACT_FORMAT_VERSION,
    c: compactCollection(collection!),
    l: listings.map(imovelToCompactArray),
  }

  const json = JSON.stringify(compactExport)
  const compressed = LZString.compressToEncodedURIComponent(json)
  return compressed
}

/**
 * Checks if data is in compact v2 format
 */
function isCompactFormat(data: unknown): data is CompactExport {
  return (
    typeof data === "object" &&
    data !== null &&
    "_v" in data &&
    (data as CompactExport)._v === COMPACT_FORMAT_VERSION &&
    "c" in data &&
    "l" in data &&
    Array.isArray((data as CompactExport).l)
  )
}

/**
 * Decompresses collection data from URL-safe string
 * Supports multiple formats for backwards compatibility:
 * - v2 compact format (array-of-arrays with version header)
 * - v1 minified format (object with minified keys)
 * - Original format (object with full keys)
 */
export function decompressCollectionData(compressed: string): CollectionExport {
  if (typeof window === "undefined") {
    throw new Error("Decompression is only available in the browser")
  }

  // Dynamic import to avoid SSR issues
  const LZString = require("lz-string")
  try {
    const json = LZString.decompressFromEncodedURIComponent(compressed)
    if (!json) {
      throw new Error("Failed to decompress data")
    }
    const parsed = JSON.parse(json)
    
    // Check for v2 compact format first
    if (isCompactFormat(parsed)) {
      const compact = parsed as CompactExport
      return {
        collection: expandCompactCollection(compact.c),
        listings: compact.l.map(compactArrayToImovel),
      }
    }
    
    // Check if data uses minified keys (v1 backwards compatibility)
    // If minified, expand keys; otherwise use as-is for old share links
    const expanded = isMinified(parsed) ? expandKeys(parsed) : parsed
    const result = expanded as CollectionExport
    
    // Validate structure
    if (!result.collection || !result.listings || !Array.isArray(result.listings)) {
      throw new Error("Invalid data format")
    }
    
    return result
  } catch (error) {
    console.error("Failed to decompress collection data:", error)
    throw error
  }
}

