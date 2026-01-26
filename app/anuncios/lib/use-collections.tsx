"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react"
import {
  fetchCollections,
  fetchListings,
  createCollection as apiCreateCollection,
  updateCollection as apiUpdateCollection,
  deleteCollection as apiDeleteCollection,
  createListing as apiCreateListing,
  updateApiListing,
  deleteListing as apiDeleteListing,
  parseListingWithAI as apiParseListingWithAI,
  type Collection,
  type Imovel,
} from "./api"
import type { ListingData } from "@/lib/db/schema"

// ============================================================================
// TYPES
// ============================================================================

interface CollectionsContextValue {
  // Collections state
  collections: Collection[]
  activeCollection: Collection | null
  isLoading: boolean
  error: string | null

  // Listings state
  listings: Imovel[]
  isLoadingListings: boolean

  // Collection actions
  loadCollections: () => Promise<void>
  setActiveCollection: (collection: Collection | null) => void
  createCollection: (name: string, isDefault?: boolean) => Promise<Collection>
  updateCollection: (id: string, updates: { name?: string; isDefault?: boolean }) => Promise<Collection>
  deleteCollection: (id: string) => Promise<void>
  setDefaultCollection: (id: string) => Promise<Collection>

  // Listing actions
  loadListings: (collectionId?: string) => Promise<void>
  addListing: (listingData: ListingData) => Promise<Imovel>
  updateListing: (listingId: string, updates: Partial<Imovel>) => Promise<Imovel>
  removeListing: (listingId: string) => Promise<void>
  
  // AI parsing
  parseListing: (rawText: string) => Promise<ListingData>

  // Refresh trigger for legacy components
  refreshTrigger: number
  triggerRefresh: () => void
}

// ============================================================================
// CONTEXT
// ============================================================================

const CollectionsContext = createContext<CollectionsContextValue | null>(null)

// ============================================================================
// PROVIDER
// ============================================================================

interface CollectionsProviderProps {
  children: ReactNode
}

export function CollectionsProvider({ children }: CollectionsProviderProps) {
  // Collections state
  const [collections, setCollections] = useState<Collection[]>([])
  const [activeCollection, setActiveCollectionState] = useState<Collection | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Listings state
  const [listings, setListings] = useState<Imovel[]>([])
  const [isLoadingListings, setIsLoadingListings] = useState(false)

  // Refresh trigger for legacy component compatibility
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1)
  }, [])

  // ============================================================================
  // COLLECTION ACTIONS
  // ============================================================================

  const loadCollections = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const fetchedCollections = await fetchCollections()
      setCollections(fetchedCollections)

      // If there's no active collection, set the default one
      if (!activeCollection && fetchedCollections.length > 0) {
        const defaultCollection =
          fetchedCollections.find((c) => c.isDefault) || fetchedCollections[0]
        setActiveCollectionState(defaultCollection)
      } else if (activeCollection) {
        // Update the active collection in case it changed
        const updated = fetchedCollections.find((c) => c.id === activeCollection.id)
        if (updated) {
          setActiveCollectionState(updated)
        } else if (fetchedCollections.length > 0) {
          // Active collection was deleted, fall back to default
          const defaultCollection =
            fetchedCollections.find((c) => c.isDefault) || fetchedCollections[0]
          setActiveCollectionState(defaultCollection)
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load collections"
      setError(message)
      console.error("Failed to load collections:", err)
    } finally {
      setIsLoading(false)
    }
  }, [activeCollection])

  const setActiveCollection = useCallback(
    (collection: Collection | null) => {
      setActiveCollectionState(collection)
    },
    []
  )

  const createCollection = useCallback(
    async (name: string, isDefault?: boolean): Promise<Collection> => {
      const newCollection = await apiCreateCollection(name, isDefault)
      setCollections((prev) => {
        // If this is the new default, unset others
        if (isDefault) {
          return [...prev.map((c) => ({ ...c, isDefault: false })), newCollection]
        }
        return [...prev, newCollection]
      })
      triggerRefresh()
      return newCollection
    },
    [triggerRefresh]
  )

  const updateCollection = useCallback(
    async (
      id: string,
      updates: { name?: string; isDefault?: boolean }
    ): Promise<Collection> => {
      const updatedCollection = await apiUpdateCollection(id, updates)
      setCollections((prev) => {
        return prev.map((c) => {
          if (c.id === id) {
            return updatedCollection
          }
          // If setting as default, unset others
          if (updates.isDefault && c.isDefault) {
            return { ...c, isDefault: false }
          }
          return c
        })
      })
      // Update active collection if it was updated
      if (activeCollection?.id === id) {
        setActiveCollectionState(updatedCollection)
      }
      triggerRefresh()
      return updatedCollection
    },
    [activeCollection, triggerRefresh]
  )

  const deleteCollection = useCallback(
    async (id: string): Promise<void> => {
      await apiDeleteCollection(id)
      setCollections((prev) => {
        const remaining = prev.filter((c) => c.id !== id)
        // If we deleted the active collection, switch to default
        if (activeCollection?.id === id && remaining.length > 0) {
          const defaultCollection =
            remaining.find((c) => c.isDefault) || remaining[0]
          setActiveCollectionState(defaultCollection)
        }
        return remaining
      })
      triggerRefresh()
    },
    [activeCollection, triggerRefresh]
  )

  const setDefaultCollection = useCallback(
    async (id: string): Promise<Collection> => {
      const updatedCollection = await apiUpdateCollection(id, { isDefault: true })
      setCollections((prev) => {
        return prev.map((c) => {
          if (c.id === id) {
            return updatedCollection
          }
          // Unset other defaults
          if (c.isDefault) {
            return { ...c, isDefault: false }
          }
          return c
        })
      })
      // Update active collection if it was the one set as default
      if (activeCollection?.id === id) {
        setActiveCollectionState(updatedCollection)
      }
      triggerRefresh()
      return updatedCollection
    },
    [activeCollection, triggerRefresh]
  )

  // ============================================================================
  // LISTING ACTIONS
  // ============================================================================

  const loadListings = useCallback(
    async (collectionId?: string) => {
      const targetId = collectionId || activeCollection?.id
      if (!targetId) {
        setListings([])
        return
      }

      setIsLoadingListings(true)
      try {
        const fetchedListings = await fetchListings(targetId)
        setListings(fetchedListings)
      } catch (err) {
        console.error("Failed to load listings:", err)
        setListings([])
      } finally {
        setIsLoadingListings(false)
      }
    },
    [activeCollection]
  )

  const addListing = useCallback(
    async (listingData: ListingData): Promise<Imovel> => {
      if (!activeCollection) {
        throw new Error("No active collection")
      }

      const newListing = await apiCreateListing(activeCollection.id, listingData)
      setListings((prev) => [newListing, ...prev])
      triggerRefresh()
      return newListing
    },
    [activeCollection, triggerRefresh]
  )

  const updateListing = useCallback(
    async (listingId: string, updates: Partial<Imovel>): Promise<Imovel> => {
      if (!activeCollection) {
        throw new Error("No active collection")
      }

      const updatedListing = await updateApiListing(
        activeCollection.id,
        listingId,
        updates
      )
      setListings((prev) =>
        prev.map((l) => (l.id === listingId ? updatedListing : l))
      )
      triggerRefresh()
      return updatedListing
    },
    [activeCollection, triggerRefresh]
  )

  const removeListing = useCallback(
    async (listingId: string): Promise<void> => {
      if (!activeCollection) {
        throw new Error("No active collection")
      }

      await apiDeleteListing(activeCollection.id, listingId)
      setListings((prev) => prev.filter((l) => l.id !== listingId))
      triggerRefresh()
    },
    [activeCollection, triggerRefresh]
  )

  // ============================================================================
  // AI PARSING
  // ============================================================================

  const parseListing = useCallback(async (rawText: string): Promise<ListingData> => {
    return apiParseListingWithAI(rawText)
  }, [])

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Load collections on mount
  useEffect(() => {
    loadCollections()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load listings when active collection changes
  useEffect(() => {
    if (activeCollection) {
      loadListings(activeCollection.id)
    } else {
      setListings([])
    }
  }, [activeCollection?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const value: CollectionsContextValue = {
    // Collections state
    collections,
    activeCollection,
    isLoading,
    error,

    // Listings state
    listings,
    isLoadingListings,

    // Collection actions
    loadCollections,
    setActiveCollection,
    createCollection,
    updateCollection,
    deleteCollection,
    setDefaultCollection,

    // Listing actions
    loadListings,
    addListing,
    updateListing,
    removeListing,

    // AI parsing
    parseListing,

    // Refresh trigger
    refreshTrigger,
    triggerRefresh,
  }

  return (
    <CollectionsContext.Provider value={value}>
      {children}
    </CollectionsContext.Provider>
  )
}

// ============================================================================
// HOOK
// ============================================================================

export function useCollections(): CollectionsContextValue {
  const context = useContext(CollectionsContext)
  if (!context) {
    throw new Error("useCollections must be used within a CollectionsProvider")
  }
  return context
}
