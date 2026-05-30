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
  fetchListing,
  createCollection as apiCreateCollection,
  updateCollection as apiUpdateCollection,
  deleteCollection as apiDeleteCollection,
  copyCollection as apiCopyCollection,
  createListing as apiCreateListing,
  updateApiListing,
  deleteListing as apiDeleteListing,
  parseListing as apiParseListing,
  getShareStatus as apiGetShareStatus,
  createShareLink as apiCreateShareLink,
  revokeShareLink as apiRevokeShareLink,
  fetchSharedCollection as apiFetchSharedCollection,
  fetchPublicCollections as apiFetchPublicCollections,
  fetchPublicCollectionListings as apiFetchPublicCollectionListings,
  syncCollectionListingTitles as apiSyncCollectionListingTitles,
  type Collection,
  type Imovel,
  type ShareInfo,
} from "./api"
import type { ListingData } from "@/lib/db/schema"
import {
  collectionNeedsTitleSync,
  listingTitleRegenFieldChanged,
  prepareListingDataForCreate,
} from "@/lib/listing-display-title"
import { useListingDisplayTitles } from "@/lib/hooks/use-listing-display-titles"
import { isListingImageIngesting } from "@/lib/listing-images"
import {
  getStoredOrgContext,
  ORGANIZATION_CONTEXT_CHANGE_EVENT,
  type OrganizationContext,
} from "@/components/organization-switcher"

/** Whether a collection target (personal vs org) matches the active org context. */
export function isCollectionProfileMatch(
  targetOrgId: string | null | undefined,
  orgContext: OrganizationContext
): boolean {
  if (targetOrgId) {
    return (
      orgContext.type === "organization" &&
      orgContext.organizationId === targetOrgId
    )
  }
  return orgContext.type === "personal"
}

// ============================================================================
// TYPES
// ============================================================================

interface CollectionsContextValue {
  // Organization context
  orgContext: OrganizationContext
  setOrgContext: (context: OrganizationContext) => void

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
  createCollectionInProfile: (name: string, targetOrgId: string | null, isDefault?: boolean) => Promise<Collection>
  updateCollection: (id: string, updates: { name?: string; isDefault?: boolean; isPublic?: boolean }) => Promise<Collection>
  deleteCollection: (id: string) => Promise<void>
  setDefaultCollection: (id: string) => Promise<Collection>
  copyCollectionToProfile: (collectionId: string, targetOrgId: string | null, options?: { includeListings?: boolean; newName?: string }) => Promise<{ collection: Collection; copiedListingsCount: number }>

  // Sharing actions
  getShareStatus: (collectionId: string) => Promise<ShareInfo>
  shareCollection: (collectionId: string) => Promise<string>
  unshareCollection: (collectionId: string) => Promise<void>
  loadSharedCollection: (token: string) => Promise<{ collection: { id: string; name: string }; listings: Imovel[] }>

  // Public collections actions
  loadPublicCollections: () => Promise<Collection[]>
  loadPublicCollectionListings: (collectionId: string) => Promise<{ collection: Collection; listings: Imovel[] }>
  toggleCollectionPublic: (collectionId: string, isPublic: boolean) => Promise<Collection>

  // Listing actions
  loadListings: (collectionId?: string, options?: { silent?: boolean }) => Promise<void>
  refreshListing: (listingId: string) => Promise<Imovel | null>
  addListing: (listingData: ListingData) => Promise<Imovel>
  updateListing: (listingId: string, updates: Partial<Imovel>) => Promise<Imovel>
  removeListing: (listingId: string) => Promise<void>
  getListingDisplayTitle: (listing: Imovel) => string
  
  // AI parsing
  parseListing: (rawText: string) => Promise<ListingData[]>
  parseListingInput: (
    input: import("./parse-input").ParseRequest
  ) => Promise<ListingData[]>

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
  enabled?: boolean
}

const ACTIVE_COLLECTION_STORAGE_PREFIX = "minha-casa:active-collection"

export function getActiveCollectionStorageKey(
  orgContext: OrganizationContext
): string {
  if (orgContext.type === "organization") {
    return `${ACTIVE_COLLECTION_STORAGE_PREFIX}:org:${orgContext.organizationId ?? "unknown"}`
  }
  return `${ACTIVE_COLLECTION_STORAGE_PREFIX}:personal`
}

function readStoredActiveCollectionId(
  orgContext: OrganizationContext
): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(getActiveCollectionStorageKey(orgContext))
}

function storeActiveCollectionId(
  orgContext: OrganizationContext,
  collection: Collection | null
): void {
  if (typeof window === "undefined") return
  const key = getActiveCollectionStorageKey(orgContext)
  if (collection) {
    window.localStorage.setItem(key, collection.id)
  } else {
    window.localStorage.removeItem(key)
  }
}

export function CollectionsProvider({
  children,
  enabled = true,
}: CollectionsProviderProps) {
  // Organization context
  const [orgContext, setOrgContextState] = useState<OrganizationContext>({ type: "personal" })
  const [orgContextInitialized, setOrgContextInitialized] = useState(false)

  // Collections state
  const [collections, setCollections] = useState<Collection[]>([])
  const [activeCollection, setActiveCollectionState] = useState<Collection | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Listings state
  const [listings, setListings] = useState<Imovel[]>([])
  const [isLoadingListings, setIsLoadingListings] = useState(false)
  const [listingsCollectionId, setListingsCollectionId] = useState<string | null>(null)

  // Refresh trigger for legacy component compatibility
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1)
  }, [])

  const { getDisplayTitle: getListingDisplayTitle } =
    useListingDisplayTitles(listings)

  // Initialize org context from storage on mount
  useEffect(() => {
    const storedContext = getStoredOrgContext()
    setOrgContextState(storedContext)
    setOrgContextInitialized(true)
  }, [])

  const setOrgContext = useCallback((context: OrganizationContext) => {
    setOrgContextState(context)
    // Reset collections when context changes
    setCollections([])
    setActiveCollectionState(null)
    setListings([])
    setListingsCollectionId(null)
  }, [])

  useEffect(() => {
    const handleContextChange = (event: Event) => {
      const nextContext = (event as CustomEvent<OrganizationContext>).detail
      if (!nextContext) return
      setOrgContext(nextContext)
      setOrgContextInitialized(true)
    }

    window.addEventListener(
      ORGANIZATION_CONTEXT_CHANGE_EVENT,
      handleContextChange
    )
    return () => {
      window.removeEventListener(
        ORGANIZATION_CONTEXT_CHANGE_EVENT,
        handleContextChange
      )
    }
  }, [setOrgContext])

  // ============================================================================
  // COLLECTION ACTIONS
  // ============================================================================

  const loadCollections = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const orgId = orgContext.type === "organization" ? orgContext.organizationId : undefined
      const fetchedCollections = await fetchCollections(orgId)
      setCollections(fetchedCollections)

      const getFallbackCollection = () => {
        const storedId = readStoredActiveCollectionId(orgContext)
        return (
          fetchedCollections.find((c) => c.id === storedId) ||
          fetchedCollections.find((c) => c.isDefault) ||
          fetchedCollections[0] ||
          null
        )
      }

      // If there's no active collection, set the stored/default one
      if (!activeCollection && fetchedCollections.length > 0) {
        const nextCollection = getFallbackCollection()
        setActiveCollectionState(nextCollection)
        storeActiveCollectionId(orgContext, nextCollection)
      } else if (!activeCollection) {
        storeActiveCollectionId(orgContext, null)
      } else if (activeCollection) {
        // Update the active collection in case it changed
        const updated = fetchedCollections.find((c) => c.id === activeCollection.id)
        if (updated) {
          setActiveCollectionState(updated)
          storeActiveCollectionId(orgContext, updated)
        } else if (fetchedCollections.length > 0) {
          // Active collection was deleted, fall back to default
          const nextCollection = getFallbackCollection()
          setActiveCollectionState(nextCollection)
          storeActiveCollectionId(orgContext, nextCollection)
        } else {
          setActiveCollectionState(null)
          storeActiveCollectionId(orgContext, null)
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load collections"
      setError(message)
      console.error("Failed to load collections:", err)
    } finally {
      setIsLoading(false)
    }
  }, [activeCollection, orgContext])

  const setActiveCollection = useCallback(
    (collection: Collection | null) => {
      setActiveCollectionState(collection)
      storeActiveCollectionId(orgContext, collection)
    },
    [orgContext]
  )

  const createCollection = useCallback(
    async (name: string, isDefault?: boolean): Promise<Collection> => {
      const orgId =
        orgContext.type === "organization"
          ? orgContext.organizationId
          : undefined
      if (orgContext.type === "organization" && !orgId) {
        throw new Error("Organização inválida. Selecione uma organização válida.")
      }
      const newCollection = await apiCreateCollection(name, isDefault, orgId)
      setCollections((prev) => {
        // If this is the new default, unset others
        if (isDefault) {
          return [...prev.map((c) => ({ ...c, isDefault: false })), newCollection]
        }
        return [...prev, newCollection]
      })
      setActiveCollectionState((prev) => {
        if (prev) return prev
        storeActiveCollectionId(orgContext, newCollection)
        return newCollection
      })
      triggerRefresh()
      return newCollection
    },
    [triggerRefresh, orgContext]
  )

  // Create a collection in a specific profile (personal or organization)
  const createCollectionInProfile = useCallback(
    async (name: string, targetOrgId: string | null, isDefault?: boolean): Promise<Collection> => {
      // targetOrgId = null means personal, otherwise org
      const newCollection = await apiCreateCollection(name, isDefault, targetOrgId ?? undefined)

      if (isCollectionProfileMatch(targetOrgId, orgContext)) {
        setCollections((prev) => {
          if (isDefault) {
            return [...prev.map((c) => ({ ...c, isDefault: false })), newCollection]
          }
          return [...prev, newCollection]
        })
        setActiveCollectionState(newCollection)
        storeActiveCollectionId(orgContext, newCollection)
      }

      triggerRefresh()
      return newCollection
    },
    [triggerRefresh, orgContext]
  )

  const updateCollection = useCallback(
    async (
      id: string,
      updates: { name?: string; isDefault?: boolean; isPublic?: boolean }
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
        storeActiveCollectionId(orgContext, updatedCollection)
      }
      triggerRefresh()
      return updatedCollection
    },
    [activeCollection, triggerRefresh, orgContext]
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
          storeActiveCollectionId(orgContext, defaultCollection)
        }
        if (activeCollection?.id === id && remaining.length === 0) {
          storeActiveCollectionId(orgContext, null)
        }
        return remaining
      })
      triggerRefresh()
    },
    [activeCollection, triggerRefresh, orgContext]
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
        storeActiveCollectionId(orgContext, updatedCollection)
      }
      triggerRefresh()
      return updatedCollection
    },
    [activeCollection, triggerRefresh, orgContext]
  )

  // Copy a collection to another profile (personal or organization)
  const copyCollectionToProfile = useCallback(
    async (
      collectionId: string,
      targetOrgId: string | null,
      options?: { includeListings?: boolean; newName?: string }
    ): Promise<{ collection: Collection; copiedListingsCount: number }> => {
      const result = await apiCopyCollection(collectionId, targetOrgId, options)
      
      // Only update local state if we're copying to the current context
      const currentOrgId = orgContext.type === "organization" ? orgContext.organizationId : null
      if (targetOrgId === currentOrgId) {
        setCollections((prev) => [...prev, result.collection])
      }
      
      triggerRefresh()
      return result
    },
    [triggerRefresh, orgContext]
  )

  // ============================================================================
  // SHARING ACTIONS
  // ============================================================================

  const getShareStatus = useCallback(async (collectionId: string): Promise<ShareInfo> => {
    return apiGetShareStatus(collectionId)
  }, [])

  const shareCollection = useCallback(
    async (collectionId: string): Promise<string> => {
      const result = await apiCreateShareLink(collectionId)
      triggerRefresh()
      return result.shareUrl
    },
    [triggerRefresh]
  )

  const unshareCollection = useCallback(
    async (collectionId: string): Promise<void> => {
      await apiRevokeShareLink(collectionId)
      triggerRefresh()
    },
    [triggerRefresh]
  )

  const loadSharedCollection = useCallback(
    async (token: string): Promise<{ collection: { id: string; name: string }; listings: Imovel[] }> => {
      const result = await apiFetchSharedCollection(token)
      // Convert API listings to Imovel format
      const { toImovel } = await import("./api")
      const convertedListings = result.listings.map(toImovel)
      return {
        collection: result.collection,
        listings: convertedListings,
      }
    },
    []
  )

  // ============================================================================
  // PUBLIC COLLECTIONS ACTIONS
  // ============================================================================

  const loadPublicCollections = useCallback(async (): Promise<Collection[]> => {
    return apiFetchPublicCollections()
  }, [])

  const loadPublicCollectionListings = useCallback(
    async (collectionId: string): Promise<{ collection: Collection; listings: Imovel[] }> => {
      return apiFetchPublicCollectionListings(collectionId)
    },
    []
  )

  const toggleCollectionPublic = useCallback(
    async (collectionId: string, isPublic: boolean): Promise<Collection> => {
      const updatedCollection = await apiUpdateCollection(collectionId, { isPublic })
      setCollections((prev) =>
        prev.map((c) => (c.id === collectionId ? updatedCollection : c))
      )
      if (activeCollection?.id === collectionId) {
        setActiveCollectionState(updatedCollection)
        storeActiveCollectionId(orgContext, updatedCollection)
      }
      triggerRefresh()
      return updatedCollection
    },
    [activeCollection, triggerRefresh, orgContext]
  )

  // ============================================================================
  // LISTING ACTIONS
  // ============================================================================

  const loadListings = useCallback(
    async (collectionId?: string, options?: { silent?: boolean }) => {
      const targetId = collectionId || activeCollection?.id
      if (!targetId) {
        setListings([])
        setListingsCollectionId(null)
        return
      }

      const silent = options?.silent ?? false
      const shouldShowLoading =
        !silent && (listingsCollectionId !== targetId || listings.length === 0)
      if (shouldShowLoading) {
        setIsLoadingListings(true)
      }
      try {
        let fetchedListings = await fetchListings(targetId)
        if (collectionNeedsTitleSync(fetchedListings)) {
          try {
            fetchedListings = await apiSyncCollectionListingTitles(targetId)
          } catch (syncErr) {
            console.error("Failed to sync listing titles:", syncErr)
          }
        }
        setListings(fetchedListings)
        setListingsCollectionId(targetId)
      } catch (err) {
        console.error("Failed to load listings:", err)
        if (!silent && listingsCollectionId !== targetId) {
          setListings([])
          setListingsCollectionId(null)
        }
      } finally {
        if (shouldShowLoading) {
          setIsLoadingListings(false)
        }
      }
    },
    [activeCollection, listings, listingsCollectionId]
  )

  const refreshListing = useCallback(
    async (listingId: string): Promise<Imovel | null> => {
      if (!activeCollection?.id) {
        return null
      }

      try {
        const updatedListing = await fetchListing(activeCollection.id, listingId)
        setListings((prev) =>
          prev.map((l) => (l.id === listingId ? updatedListing : l))
        )
        return updatedListing
      } catch (err) {
        console.error("Failed to refresh listing:", err)
        return null
      }
    },
    [activeCollection?.id]
  )

  const addListing = useCallback(
    async (listingData: ListingData): Promise<Imovel> => {
      if (!activeCollection) {
        throw new Error("No active collection")
      }

      const prepared = prepareListingDataForCreate(listingData, listings)
      const newListing = await apiCreateListing(activeCollection.id, prepared)
      const synced = await apiSyncCollectionListingTitles(activeCollection.id)
      setListings(synced)
      return synced.find((l) => l.id === newListing.id) ?? newListing
    },
    [activeCollection, listings]
  )

  const updateListing = useCallback(
    async (listingId: string, updates: Partial<Imovel>): Promise<Imovel> => {
      if (!activeCollection) {
        throw new Error("No active collection")
      }

      await updateApiListing(activeCollection.id, listingId, updates)

      if (listingTitleRegenFieldChanged(updates)) {
        const synced = await apiSyncCollectionListingTitles(activeCollection.id)
        setListings(synced)
        return synced.find((l) => l.id === listingId) ?? (await fetchListing(activeCollection.id, listingId))
      }

      const updatedListing = await fetchListing(activeCollection.id, listingId)
      setListings((prev) =>
        prev.map((l) => (l.id === listingId ? updatedListing : l))
      )
      return updatedListing
    },
    [activeCollection]
  )

  const removeListing = useCallback(
    async (listingId: string): Promise<void> => {
      if (!activeCollection) {
        throw new Error("No active collection")
      }

      await apiDeleteListing(activeCollection.id, listingId)
      const synced = await apiSyncCollectionListingTitles(activeCollection.id)
      setListings(synced)
    },
    [activeCollection]
  )

  // ============================================================================
  // AI PARSING
  // ============================================================================

  const parseListing = useCallback(async (rawText: string): Promise<ListingData[]> => {
    return apiParseListing({ kind: "text", rawText })
  }, [])

  const parseListingInput = useCallback(
    async (input: import("./parse-input").ParseRequest): Promise<ListingData[]> => {
      return apiParseListing(input)
    },
    []
  )

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Load collections on mount and when org context changes
  // Only load after org context has been initialized from localStorage
  useEffect(() => {
    if (enabled && orgContextInitialized) {
      loadCollections()
    }
  }, [enabled, orgContext, orgContextInitialized]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load listings when active collection changes
  useEffect(() => {
    if (!enabled) return
    if (activeCollection) {
      if (listingsCollectionId !== activeCollection.id) {
        setListings([])
      }
      loadListings(activeCollection.id)
    } else {
      setListings([])
      setListingsCollectionId(null)
    }
  }, [enabled, activeCollection?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Poll ingesting listings individually (max ~2 min)
  const ingestingListingIdsKey = listings
    .filter((listing) => isListingImageIngesting(listing.imageIngestionStatus))
    .map((listing) => listing.id)
    .join(",")

  useEffect(() => {
    if (!ingestingListingIdsKey || !activeCollection?.id) return

    const ingestingIds = ingestingListingIdsKey.split(",")
    let ticks = 0
    const intervalId = window.setInterval(() => {
      ticks += 1
      if (ticks > 40) {
        window.clearInterval(intervalId)
        return
      }
      void Promise.all(ingestingIds.map((id) => refreshListing(id)))
    }, 3000)

    return () => window.clearInterval(intervalId)
  }, [ingestingListingIdsKey, activeCollection?.id, refreshListing])

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const value: CollectionsContextValue = {
    // Organization context
    orgContext,
    setOrgContext,

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
    createCollectionInProfile,
    updateCollection,
    deleteCollection,
    setDefaultCollection,
    copyCollectionToProfile,

    // Sharing actions
    getShareStatus,
    shareCollection,
    unshareCollection,
    loadSharedCollection,

    // Public collections actions
    loadPublicCollections,
    loadPublicCollectionListings,
    toggleCollectionPublic,

    // Listing actions
    loadListings,
    refreshListing,
    addListing,
    updateListing,
    removeListing,
    getListingDisplayTitle,

    // AI parsing
    parseListing,
    parseListingInput,

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
