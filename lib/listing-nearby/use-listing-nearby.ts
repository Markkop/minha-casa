"use client"

import { useCallback, useEffect, useState } from "react"
import type { NearbySection } from "@/lib/property-analysis/types"

export function useListingNearby(
  listingId: string | null,
  orgId?: string | null
) {
  const [nearby, setNearby] = useState<NearbySection | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!listingId) {
      setNearby(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (orgId) params.set("orgId", orgId)
      const qs = params.toString()
      const res = await fetch(
        `/api/listings/${listingId}/nearby${qs ? `?${qs}` : ""}`
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Erro ao carregar proximidades"
        )
      }
      setNearby(data.nearby ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar proximidades")
      setNearby(null)
    } finally {
      setIsLoading(false)
    }
  }, [listingId, orgId])

  useEffect(() => {
    void load()
  }, [load])

  return { nearby, isLoading, error, reload: load }
}
