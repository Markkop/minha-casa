"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  fetchLatestListingAnalysis,
  fetchPropertyAnalysis,
  retryAmbienteXray,
  retryAnalysisStep,
  startListingAnalysis,
} from "./client"
import type { ListingAnalysis, ListingAnalysisPipelineStep } from "./types"
import { hasPendingAmbienteXray } from "./types"

const POLL_MS = 2000
/** Allow long runs when many photos are inventoried (up to ~40 vision calls). */
const POLL_MAX_MS = 600_000

function hasRunningSteps(analysis: ListingAnalysis | null | undefined): boolean {
  return (analysis?.result?.runningSteps?.length ?? 0) > 0
}

function shouldPollAnalysis(analysis: ListingAnalysis): boolean {
  if (analysis.status === "queued" || analysis.status === "running") {
    return true
  }
  if (hasRunningSteps(analysis)) return true
  if (hasPendingAmbienteXray(analysis.result?.ambientes?.cards)) return true
  return false
}

function isPollTerminal(analysis: ListingAnalysis): boolean {
  if (hasRunningSteps(analysis)) return false
  if (hasPendingAmbienteXray(analysis.result?.ambientes?.cards)) return false
  return analysis.status === "completed" || analysis.status === "failed"
}

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
            if (isPollTerminal(data.analysis)) {
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
        if (shouldPollAnalysis(started)) {
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

  const retryStep = useCallback(
    async (step: ListingAnalysisPipelineStep) => {
      if (!analysis?.id) return
      setError(null)
      try {
        const updated = await retryAnalysisStep(analysis.id, step, orgId)
        setAnalysis(updated)
        if (shouldPollAnalysis(updated)) {
          startPolling(updated.id)
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao reexecutar etapa"
        )
      }
    },
    [analysis?.id, orgId, startPolling]
  )

  const retryAmbienteXrayStep = useCallback(
    async (ambienteId: string) => {
      if (!analysis?.id) return
      setError(null)
      try {
        const updated = await retryAmbienteXray(analysis.id, ambienteId, orgId)
        setAnalysis(updated)
        if (shouldPollAnalysis(updated)) {
          startPolling(updated.id)
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao reexecutar x-ray do ambiente"
        )
      }
    },
    [analysis?.id, orgId, startPolling]
  )

  useEffect(() => {
    stopPolling()
    setAnalysis(null)
    if (!listingId) return
    void refresh()
    return () => stopPolling()
  }, [listingId, orgId, refresh, stopPolling])

  useEffect(() => {
    if (analysis && shouldPollAnalysis(analysis) && !pollRef.current) {
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
    retryStep,
    retryAmbienteXray: retryAmbienteXrayStep,
  }
}
