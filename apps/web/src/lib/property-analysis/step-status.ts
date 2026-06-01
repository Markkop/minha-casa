import type { ListingAnalysisPipelineStep, ListingAnalysisResult } from "./types"
import { isListingAnalysisV6 } from "./types"

export type AnalysisStepStatus = "done" | "incomplete" | "pending" | "waiting" | "failed"

export function analysisStepStatus(
  key: ListingAnalysisPipelineStep,
  result: ListingAnalysisResult | null | undefined,
  isRunning: boolean
): AnalysisStepStatus {
  if (!isListingAnalysisV6(result)) {
    return isRunning ? "pending" : "waiting"
  }

  const completed = new Set(result.completedSteps ?? [])
  const failed = new Set(result.failedSteps ?? [])
  const running = new Set(result.runningSteps ?? [])

  if (running.has(key)) return "pending"

  if (key === "xray") {
    return xrayAggregateStatus(result, isRunning)
  }

  if (failed.has(key)) return "failed"
  if (stepHasContent(key, result)) return "done"
  if (completed.has(key)) return "incomplete"

  if (key === "idade") {
    if (!completed.has("ambientes") && !result.ambientes?.cards?.length) {
      return "waiting"
    }
  }

  if (isRunning) return "pending"
  return "waiting"
}

function xrayAggregateStatus(
  result: ListingAnalysisResult,
  isRunning: boolean
): AnalysisStepStatus {
  const cards = result.ambientes?.cards ?? []

  if (cards.length === 0) {
    if (!result.ambientes?.cards?.length && isRunning) return "waiting"
    return "waiting"
  }

  const statuses = cards.map((c) => c.xrayStatus ?? "waiting")

  if (statuses.some((s) => s === "pending")) return "pending"
  if (statuses.every((s) => s === "done")) return "done"
  if (statuses.some((s) => s === "failed")) return "failed"

  const anyDone = statuses.some((s) => s === "done")
  const anyWaiting = statuses.some((s) => s === "waiting")

  if (anyWaiting && isRunning) return "pending"
  if (anyDone && anyWaiting) return "incomplete"
  if (anyWaiting) return "waiting"

  return "incomplete"
}

function stepHasContent(
  key: ListingAnalysisPipelineStep,
  result: ListingAnalysisResult
): boolean {
  switch (key) {
    case "clima":
      return Boolean(
        result.clima &&
          !result.clima.skipped &&
          result.clima.resumo?.trim() &&
          result.clima.temperaturas?.descricao
      )
    case "riscos":
      return Boolean(result.riscos && !result.riscos.skipped && result.riscos.paragrafo?.trim())
    case "mercado":
      return Boolean(result.mercado && !result.mercado.skipped && result.mercado.paragrafo?.trim())
    case "ambientes":
      return (result.ambientes?.cards?.length ?? 0) > 0
    case "idade":
      return Boolean(
        result.idade &&
          !result.idade.skipped &&
          (result.idade.resumo?.trim() || (result.idade.sinaisVistos?.length ?? 0) > 0)
      )
    case "xray": {
      const cards = result.ambientes?.cards ?? []
      return (
        cards.length > 0 &&
        cards.every(
          (c) =>
            c.xrayStatus === "done" &&
            (c.pontosAtencao?.length ?? 0) >= 1
        )
      )
    }
    default:
      return false
  }
}
