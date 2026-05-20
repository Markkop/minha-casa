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
import { syncSubscriptionCookie } from "@/lib/sync-subscription-cookie"

export interface SubscriptionContextValue {
  hasActiveSubscription: boolean
  subscriptionReady: boolean
  refreshSubscription: () => Promise<boolean>
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(
  undefined
)

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending: sessionLoading } = useSession()
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false)
  const [subscriptionReady, setSubscriptionReady] = useState(false)

  const refreshSubscription = useCallback(async () => {
    if (!session?.user) {
      setHasActiveSubscription(false)
      setSubscriptionReady(true)
      return false
    }
    const result = await syncSubscriptionCookie()
    setHasActiveSubscription(result.hasActiveSubscription)
    setSubscriptionReady(true)
    return result.hasActiveSubscription
  }, [session?.user])

  useEffect(() => {
    if (sessionLoading) return

    if (!session?.user) {
      setHasActiveSubscription(false)
      setSubscriptionReady(true)
      return
    }

    setSubscriptionReady(false)
    void refreshSubscription()
  }, [session?.user, sessionLoading, refreshSubscription])

  useEffect(() => {
    if (!session?.user) return

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshSubscription()
      }
    }

    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [session?.user, refreshSubscription])

  const value = useMemo(
    () => ({
      hasActiveSubscription,
      subscriptionReady,
      refreshSubscription,
    }),
    [hasActiveSubscription, subscriptionReady, refreshSubscription]
  )

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscriptionAccess(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext)
  if (!ctx) {
    throw new Error("useSubscriptionAccess must be used within SubscriptionProvider")
  }
  return ctx
}
