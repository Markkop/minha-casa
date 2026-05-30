"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useSession } from "@/lib/auth-client"
import {
  type AdminFeatureFlagName,
  type AdminFeatureFlags,
  defaultAdminFeatureFlags,
  getAdminFlag,
  mergeAdminFlagUpdate,
  readAdminFlagsFromStorage,
  writeAdminFlagsToStorage,
} from "./admin-feature-flags"

type SessionUser = {
  isAdmin?: boolean
}

interface AdminFeatureFlagsContextType {
  flags: AdminFeatureFlags
  isAdmin: boolean
  isReady: boolean
  getAdminFlagValue: (key: AdminFeatureFlagName) => boolean
  setFlag: (key: AdminFeatureFlagName, value: boolean) => void
}

const AdminFeatureFlagsContext = createContext<
  AdminFeatureFlagsContextType | undefined
>(undefined)

export function AdminFeatureFlagsProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const user = session?.user as SessionUser | undefined
  const isAdmin = user?.isAdmin === true

  const [flags, setFlags] = useState<AdminFeatureFlags>(defaultAdminFeatureFlags)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!isAdmin) {
      setFlags(defaultAdminFeatureFlags)
      setIsReady(true)
      return
    }

    setFlags(readAdminFlagsFromStorage())
    setIsReady(true)
  }, [isAdmin])

  const setFlag = useCallback(
    (key: AdminFeatureFlagName, value: boolean) => {
      if (!isAdmin) return

      setFlags((current) => {
        const next = mergeAdminFlagUpdate(current, key, value)
        writeAdminFlagsToStorage(next)
        return next
      })
    },
    [isAdmin]
  )

  const getAdminFlagValue = useCallback(
    (key: AdminFeatureFlagName) => getAdminFlag(flags, key, isAdmin),
    [flags, isAdmin]
  )

  const contextValue = useMemo(
    () => ({
      flags,
      isAdmin,
      isReady,
      getAdminFlagValue,
      setFlag,
    }),
    [flags, isAdmin, isReady, getAdminFlagValue, setFlag]
  )

  return (
    <AdminFeatureFlagsContext.Provider value={contextValue}>
      {children}
    </AdminFeatureFlagsContext.Provider>
  )
}

export function useAdminFeatureFlags(): AdminFeatureFlagsContextType {
  const context = useContext(AdminFeatureFlagsContext)

  if (context === undefined) {
    throw new Error(
      "useAdminFeatureFlags must be used within AdminFeatureFlagsProvider"
    )
  }

  return context
}

export function useAdminFlag(key: AdminFeatureFlagName): boolean {
  const { getAdminFlagValue, isReady } = useAdminFeatureFlags()
  if (!isReady) return false
  return getAdminFlagValue(key)
}
