"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react"
import {
  getStoredOrgContext,
  type OrganizationContext,
} from "@/components/organization-switcher"
import type { UserAddon, OrganizationAddon } from "./addons"

// ============================================================================
// Types
// ============================================================================

export interface AddonsContextValue {
  /** Addons granted to the current user */
  userAddons: UserAddon[]
  /** Addons granted to the current organization (if any) */
  orgAddons: OrganizationAddon[]
  /** Check if user OR org has access to a specific addon */
  hasAddon: (slug: string) => boolean
  /** Whether addons are currently loading */
  isLoading: boolean
  /** Error message if loading failed */
  error: string | null
  /** Current organization context */
  orgContext: OrganizationContext
  /** Refresh addons from the server */
  refresh: () => Promise<void>
}

// ============================================================================
// Context
// ============================================================================

const AddonsContext = createContext<AddonsContextValue | undefined>(undefined)

// ============================================================================
// Provider
// ============================================================================

interface AddonsProviderProps {
  children: ReactNode
  /** Initial user addons (for SSR or testing) */
  initialUserAddons?: UserAddon[]
  /** Initial org addons (for SSR or testing) */
  initialOrgAddons?: OrganizationAddon[]
}

/**
 * Addons Provider
 *
 * Provides addon access information for the current user and their organization.
 * Fetches addons from the API and keeps them updated when the organization context changes.
 *
 * @example
 * ```tsx
 * // In your layout or app root
 * <AddonsProvider>
 *   <App />
 * </AddonsProvider>
 * ```
 */
export function AddonsProvider({
  children,
  initialUserAddons = [],
  initialOrgAddons = [],
}: AddonsProviderProps) {
  const hasInitialData = initialUserAddons.length > 0 || initialOrgAddons.length > 0
  const [userAddons, setUserAddons] = useState<UserAddon[]>(initialUserAddons)
  const [orgAddons, setOrgAddons] = useState<OrganizationAddon[]>(initialOrgAddons)
  const [isLoading, setIsLoading] = useState(!hasInitialData)
  const [error, setError] = useState<string | null>(null)
  const [orgContext, setOrgContext] = useState<OrganizationContext>({ type: "personal" })
  const [initialized, setInitialized] = useState(false)
  const [shouldFetch, setShouldFetch] = useState(!hasInitialData)

  // Initialize org context from storage on mount
  useEffect(() => {
    const storedContext = getStoredOrgContext()
    setOrgContext(storedContext)
    setInitialized(true)
  }, [])

  // Fetch user addons
  const fetchUserAddons = useCallback(async (): Promise<UserAddon[]> => {
    try {
      const response = await fetch("/api/user/addons")
      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated, return empty array
          return []
        }
        throw new Error(`Failed to fetch user addons: ${response.statusText}`)
      }
      const data = await response.json()
      return data.addons ?? []
    } catch (err) {
      console.error("Failed to fetch user addons:", err)
      throw err
    }
  }, [])

  // Fetch org addons
  const fetchOrgAddons = useCallback(async (orgId: string): Promise<OrganizationAddon[]> => {
    try {
      const response = await fetch(`/api/organizations/${orgId}/addons`)
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Not authorized to view org addons
          return []
        }
        throw new Error(`Failed to fetch org addons: ${response.statusText}`)
      }
      const data = await response.json()
      return data.addons ?? []
    } catch (err) {
      console.error("Failed to fetch org addons:", err)
      throw err
    }
  }, [])

  // Load all addons
  const loadAddons = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch user addons
      const userAddonsData = await fetchUserAddons()
      setUserAddons(userAddonsData)

      // Fetch org addons if in organization context
      if (orgContext.type === "organization" && orgContext.organizationId) {
        const orgAddonsData = await fetchOrgAddons(orgContext.organizationId)
        setOrgAddons(orgAddonsData)
      } else {
        setOrgAddons([])
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load addons"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [fetchUserAddons, fetchOrgAddons, orgContext])

  // Public refresh function - always fetches, even with initial data
  const refresh = useCallback(async () => {
    setShouldFetch(true)
    await loadAddons()
  }, [loadAddons])

  // Check if user OR org has access to a specific addon
  const hasAddon = useCallback(
    (slug: string): boolean => {
      // Check user addons
      const hasUserAddon = userAddons.some(
        (addon) => addon.addonSlug === slug && addon.enabled
      )
      if (hasUserAddon) {
        return true
      }

      // Check org addons
      const hasOrgAddon = orgAddons.some(
        (addon) => addon.addonSlug === slug && addon.enabled
      )
      return hasOrgAddon
    },
    [userAddons, orgAddons]
  )

  // Load addons when initialized or when org context changes
  // Skip initial fetch if we have initial data (SSR or test data)
  useEffect(() => {
    if (initialized && shouldFetch) {
      loadAddons()
    }
  }, [initialized, orgContext, shouldFetch]) // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for org context changes from localStorage
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "minha-casa-org-context") {
        const storedContext = getStoredOrgContext()
        setOrgContext(storedContext)
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  // Memoize context value
  const contextValue = useMemo(
    (): AddonsContextValue => ({
      userAddons,
      orgAddons,
      hasAddon,
      isLoading,
      error,
      orgContext,
      refresh,
    }),
    [userAddons, orgAddons, hasAddon, isLoading, error, orgContext, refresh]
  )

  return (
    <AddonsContext.Provider value={contextValue}>
      {children}
    </AddonsContext.Provider>
  )
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to access addon information
 *
 * Must be used within an AddonsProvider.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { userAddons, orgAddons, hasAddon, isLoading } = useAddons()
 *
 *   if (isLoading) return <Loading />
 *
 *   if (hasAddon('financiamento')) {
 *     return <FinancingSimulator />
 *   }
 *
 *   return <UpgradePrompt />
 * }
 * ```
 */
export function useAddons(): AddonsContextValue {
  const context = useContext(AddonsContext)

  if (context === undefined) {
    throw new Error("useAddons must be used within an AddonsProvider")
  }

  return context
}

/**
 * Hook to check if a specific addon is available
 *
 * Convenience hook that returns true if the user OR their org has the addon.
 *
 * @example
 * ```tsx
 * function FloodRiskPage() {
 *   const hasFloodAddon = useHasAddon('flood')
 *
 *   if (!hasFloodAddon) {
 *     return <AddonRequiredMessage addonName="Flood Risk Analysis" />
 *   }
 *
 *   return <FloodRiskContent />
 * }
 * ```
 */
export function useHasAddon(slug: string): boolean {
  const { hasAddon } = useAddons()
  return hasAddon(slug)
}

/**
 * Hook to get addon loading state
 *
 * @example
 * ```tsx
 * function AddonGatedContent() {
 *   const isLoading = useAddonsLoading()
 *
 *   if (isLoading) {
 *     return <Skeleton />
 *   }
 *
 *   return <Content />
 * }
 * ```
 */
export function useAddonsLoading(): boolean {
  const { isLoading } = useAddons()
  return isLoading
}
