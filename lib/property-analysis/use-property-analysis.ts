"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  fetchLatestListingAnalysis,
  fetchPropertyAnalysis,
  startListingAnalysis,
} from "./client"
import type { ListingAnalysis } from "./types"

const POLL_MS = 2000
/** Allow long runs when many photos are inventoried (up to ~40 vision calls). */
const POLL_MAX_MS = 600_000

export function usePropertyAnalysis(
  listingId: string | null,
  orgId?: string | null
) {
  const [analysis, setAnalysis] = useState<ListingAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollStartedRef = useRef<number | null>(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    pollStartedRef.current = null
  }, [])

  const refresh = useCallback(
    async (analysisId?: string) => {
      if (!listingId) return
      setIsLoading(true)
      setError(null)
      try {
        if (analysisId) {
          const data = await fetchPropertyAnalysis(analysisId, orgId)
          setAnalysis(data.analysis)
        } else {
          const latest = await fetchLatestListingAnalysis(listingId, orgId)
          setAnalysis(latest)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar análise")
      } finally {
        setIsLoading(false)
      }
    },
    [listingId, orgId]
  )

  const startPolling = useCallback(
    (analysisId: string) => {
      stopPolling()
      pollStartedRef.current = Date.now()

      pollRef.current = setInterval(() => {
        void (async () => {
          if (
            pollStartedRef.current &&
            Date.now() - pollStartedRef.current > POLL_MAX_MS
          ) {
            stopPolling()
            setError("A análise está demorando mais que o esperado. Tente atualizar.")
            return
          }

          try {
            const data = await fetchPropertyAnalysis(analysisId, orgId)
            setAnalysis(data.analysis)
            if (
              data.analysis.status === "completed" ||
              data.analysis.status === "failed"
            ) {
              stopPolling()
            }
          } catch {
            /* keep polling */
          }
        })()
      }, POLL_MS)
    },
    [orgId, stopPolling]
  )

  const runAnalysis = useCallback(
    async (addressOverride?: string) => {
      if (!listingId) return
      setIsStarting(true)
      setError(null)
      stopPolling()
      setAnalysis(null)
      try {
        const started = await startListingAnalysis(listingId, {
          addressOverride,
          orgId,
          force: true,
        })
        setAnalysis(started)
        if (started.status === "queued" || started.status === "running") {
          startPolling(started.id)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao iniciar análise")
      } finally {
        setIsStarting(false)
      }
    },
    [listingId, orgId, startPolling, stopPolling]
  )

  useEffect(() => {
    stopPolling()
    setAnalysis(null)
    if (!listingId) return
    void refresh()
    return () => stopPolling()
  }, [listingId, orgId, refresh, stopPolling])

  useEffect(() => {
    if (
      analysis &&
      (analysis.status === "queued" || analysis.status === "running") &&
      !pollRef.current
    ) {
      startPolling(analysis.id)
    }
  }, [analysis, startPolling])

  const isRunning =
    analysis?.status === "queued" || analysis?.status === "running"

  return {
    analysis,
    isLoading,
    isStarting,
    isRunning,
    error,
    refresh,
    runAnalysis,
  }
}
