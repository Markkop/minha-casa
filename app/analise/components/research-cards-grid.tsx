"use client"

import type {
  ListingAnalysisPipelineStep,
  ListingAnalysisResult,
} from "@/lib/property-analysis/types"
import { analysisStepStatus } from "@/lib/property-analysis/step-status"
import { ClimateCard } from "./climate-card"
import { NaturalRisksCard } from "./natural-risks-card"
import { MarketCard } from "./market-card"
import { PropertyAgeCard } from "./property-age-card"

interface ResearchCardsGridProps {
  result: ListingAnalysisResult | null
  isRunning: boolean
  onRetryStep?: (step: ListingAnalysisPipelineStep) => void
}

function stepError(
  result: ListingAnalysisResult | null,
  step: ListingAnalysisPipelineStep
): string | undefined {
  return result?.stepErrors?.[step]?.reason
}

export function ResearchCardsGrid({
  result,
  isRunning,
  onRetryStep,
}: ResearchCardsGridProps) {
  const refresh = (step: ListingAnalysisPipelineStep) =>
    onRetryStep ? () => onRetryStep(step) : undefined

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <ClimateCard
        data={result?.clima}
        status={analysisStepStatus("clima", result, isRunning)}
        onRefresh={refresh("clima")}
        errorMessage={stepError(result, "clima")}
      />
      <NaturalRisksCard
        data={result?.riscos}
        status={analysisStepStatus("riscos", result, isRunning)}
        onRefresh={refresh("riscos")}
        errorMessage={stepError(result, "riscos")}
      />
      <MarketCard
        data={result?.mercado}
        status={analysisStepStatus("mercado", result, isRunning)}
        onRefresh={refresh("mercado")}
        errorMessage={stepError(result, "mercado")}
      />
      <PropertyAgeCard
        data={result?.idade}
        status={analysisStepStatus("idade", result, isRunning)}
        onRefresh={refresh("idade")}
        errorMessage={stepError(result, "idade")}
      />
    </div>
  )
}
