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
  preco: number | null
  precoM2: number | null
  piscina: boolean | null
  link: string | null
  starred?: boolean
  visited?: boolean
  strikethrough?: boolean
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
    const parsed = JSON.parse(json)
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
    const parsed = JSON.parse(json)
    const data = ensureCollectionsData()
    let lastImportedCollectionId: string | null = null

    // Handle different import formats
    if (Array.isArray(parsed)) {
      // Legacy format: array of Imovel[]
      // Import listings to active collection
      const targetId = data.activeCollectionId
      if (!targetId) {
        throw new Error("No active collection to import listings into")
      }

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

      const existing = data.listings[targetId] || []
      const existingIds = new Set(existing.map((l) => l.id))
      const newListings = validatedListings.filter((l) => !existingIds.has(l.id))
      data.listings[targetId] = [...existing, ...newListings]
      lastImportedCollectionId = targetId
    } else if (parsed.collection && parsed.listings && Array.isArray(parsed.listings)) {
      // CollectionExport format: single collection with listings
      const collectionExport = parsed as CollectionExport
      const { collection, listings } = collectionExport

      if (!collection || !collection.id || !collection.label) {
        throw new Error("Invalid CollectionExport format: missing collection id or label")
      }

      // Check if collection already exists
      const existingIndex = data.collections.findIndex((c) => c.id === collection.id)
      if (existingIndex !== -1) {
        // Update existing collection
        data.collections[existingIndex] = {
          ...collection,
          updatedAt: new Date().toISOString(),
        }
      } else {
        // Add new collection
        data.collections.push({
          ...collection,
          updatedAt: new Date().toISOString(),
        })
      }

      // Import listings (merge with existing)
      const existing = data.listings[collection.id] || []
      const existingIds = new Set(existing.map((l) => l.id))
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
      const newListings = validatedListings.filter((l) => !existingIds.has(l.id))
      data.listings[collection.id] = [...existing, ...newListings]
      lastImportedCollectionId = collection.id
    } else if (parsed.collections && Array.isArray(parsed.collections)) {
      // FullExport format: multiple collections
      const fullExport = parsed as FullExport

      // Import each collection
      fullExport.collections.forEach((collectionExport) => {
        const { collection, listings } = collectionExport

        if (!collection || !collection.id || !collection.label) {
          console.warn("Skipping invalid collection in import")
          return
        }

        // Check if collection already exists
        const existingIndex = data.collections.findIndex((c) => c.id === collection.id)
        if (existingIndex !== -1) {
          // Update existing collection
          data.collections[existingIndex] = {
            ...collection,
            updatedAt: new Date().toISOString(),
          }
        } else {
          // Add new collection
          data.collections.push({
            ...collection,
            updatedAt: new Date().toISOString(),
          })
        }

        // Import listings (merge with existing)
        const existing = data.listings[collection.id] || []
        const existingIds = new Set(existing.map((l) => l.id))
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
        const newListings = validatedListings.filter((l) => !existingIds.has(l.id))
        data.listings[collection.id] = [...existing, ...newListings]
        // Track the last collection processed (for FullExport, use the last one)
        lastImportedCollectionId = collection.id
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

  const json = JSON.stringify(exportData)
  const compressed = LZString.compressToEncodedURIComponent(json)
  return compressed
}

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
    const parsed = JSON.parse(json) as CollectionExport
    
    // Validate structure
    if (!parsed.collection || !parsed.listings || !Array.isArray(parsed.listings)) {
      throw new Error("Invalid data format")
    }
    
    return parsed
  } catch (error) {
    console.error("Failed to decompress collection data:", error)
    throw error
  }
}

