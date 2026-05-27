"use client"

import type { Imovel } from "@/app/anuncios/lib/api"
import { resolveListingImages } from "@/lib/listing-images"
import type {
  ListingAnalysisPipelineStep,
  ListingAnalysisResult,
} from "@/lib/property-analysis/types"
import { isListingAnalysisV6 } from "@/lib/property-analysis/types"
import { isLegacyAnalysisResult } from "@/lib/property-analysis/stale-result"
import { cn } from "@/lib/utils"
import { ResearchCardsGrid } from "./research-cards-grid"
import { AmbientesPanel } from "./ambientes-panel"

interface AnalysisSectionsProps {
  result: ListingAnalysisResult | null
  isRunning: boolean
  listing?: Imovel | null
  className?: string
  onRetryStep?: (step: ListingAnalysisPipelineStep) => void
  onRetryAmbienteXray?: (ambienteId: string) => void
}

export function AnalysisSections({
  result,
  isRunning,
  listing,
  className,
  onRetryStep,
  onRetryAmbienteXray,
}: AnalysisSectionsProps) {
  const listingImageUrls = listing
    ? resolveListingImages({
        listingId: listing.id,
        imageUrl: listing.imageUrl,
        imageUrls: listing.imageUrls,
        imageStorageKeys: listing.imageStorageKeys,
      }).imageUrls
    : []

  if (!result && !isRunning) {
    return (
      <p className={cn("text-sm text-app-muted", className)}>
        Inicie a análise profunda para ver resultados aqui.
      </p>
    )
  }

  if (result && isLegacyAnalysisResult(result)) {
    return (
      <p
        className={cn(
          "rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950",
          className
        )}
        role="status"
      >
        Análise antiga (formato anterior). Clique em{" "}
        <strong>Executar nova análise</strong> para gerar o relatório atualizado.
      </p>
    )
  }

  if (result && !isListingAnalysisV6(result) && !isRunning) {
    return null
  }

  return (
    <div className={cn("space-y-6", className)}>
      <ResearchCardsGrid
        result={result}
        isRunning={isRunning}
        onRetryStep={onRetryStep}
      />
      <AmbientesPanel
        result={result}
        isRunning={isRunning}
        imageUrls={listingImageUrls}
        onRetryStep={onRetryStep}
        onRetryAmbienteXray={onRetryAmbienteXray}
      />
    </div>
  )
}
