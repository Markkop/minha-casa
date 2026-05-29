"use client"

import { type ReactNode } from "react"

import { CollectionsProvider } from "@/app/anuncios/lib/use-collections"
import { useSession } from "@/lib/auth-client"
import { useSubscriptionAccess } from "@/lib/subscription-context"

export function WorkspaceCollectionsShell({
  children,
}: {
  children: ReactNode
}) {
  const { data: session } = useSession()
  const { hasActiveSubscription, subscriptionReady } = useSubscriptionAccess()
  const shouldLoadCollections =
    Boolean(session?.user) && subscriptionReady && hasActiveSubscription

  return (
    <CollectionsProvider enabled={shouldLoadCollections}>
      {children}
    </CollectionsProvider>
  )
}
