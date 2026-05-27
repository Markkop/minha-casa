"use client"

import { Loader2, RefreshCw } from "lucide-react"
import type {
  ListingAnalysisPipelineStep,
  ListingAnalysisResult,
} from "@/lib/property-analysis/types"
import { sumAmbienteXrayTotals } from "@/lib/property-analysis/types"
import { analysisStepStatus } from "@/lib/property-analysis/step-status"
import { WorkspacePanel } from "@/app/components/workspace-ui"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AmbienteCard } from "./ambiente-card"
import { UnassignedPhotosCard } from "./unassigned-photos-card"

interface AmbientesPanelProps {
  result: ListingAnalysisResult | null
  isRunning: boolean
  imageUrls: string[]
  className?: string
  onRetryStep?: (step: ListingAnalysisPipelineStep) => void
  onRetryAmbienteXray?: (ambienteId: string) => void
}

function StepRefreshButton({
  label,
  onClick,
  disabled,
}: {
  label: string
  onClick?: () => void
  disabled?: boolean
}) {
  if (!onClick) return null
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-7 text-app-muted hover:text-app-fg"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      <RefreshCw className="size-3.5" />
    </Button>
  )
}

function formatBrl(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value)
}

export function AmbientesPanel({
  result,
  isRunning,
  imageUrls,
  className,
  onRetryStep,
  onRetryAmbienteXray,
}: AmbientesPanelProps) {
  const status = analysisStepStatus("ambientes", result, isRunning)
  const ambientes = result?.ambientes
  const cards = ambientes?.cards ?? []
  const semCategoria = ambientes?.semCategoria?.imageIndices ?? []
  const ambientesError = result?.stepErrors?.ambientes?.reason

  const { totalMinBrl, totalMaxBrl } = sumAmbienteXrayTotals(cards)
  const hasTotals = totalMinBrl > 0 || totalMaxBrl > 0

  return (
    <div className={cn("space-y-3", className)}>
      <WorkspacePanel className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <h3 className="text-base font-semibold text-app-fg">Ambientes</h3>
              <StepRefreshButton
                label="Reexecutar reconhecimento de ambientes"
                onClick={
                  onRetryStep ? () => onRetryStep("ambientes") : undefined
                }
                disabled={status === "pending"}
              />
            </div>
            <p className="mt-1 text-sm text-app-muted">
              Reconhecimento por foto: inventário por ambiente e x-ray com pontos de
              atenção e orçamento por card.
            </p>
            {status === "failed" && ambientesError && (
              <p className="mt-1 text-xs text-destructive" title={ambientesError}>
                {ambientesError.length > 240
                  ? `${ambientesError.slice(0, 239)}…`
                  : ambientesError}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {status === "pending" && (
              <span className="inline-flex items-center gap-1 text-xs text-app-muted">
                <Loader2 className="size-3.5 animate-spin" />
                Processando…
              </span>
            )}
            {status === "done" && (
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Pronto
              </span>
            )}
            {status === "failed" && (
              <span className="text-xs font-medium text-destructive">Falhou</span>
            )}
          </div>
        </div>
        {ambientes?.resumoGeral && (
          <p className="mt-3 text-sm leading-relaxed text-app-fg">{ambientes.resumoGeral}</p>
        )}
        {hasTotals && (
          <p className="mt-2 text-xs text-app-muted">
            Total estimado (x-ray):{" "}
            <span className="font-medium text-app-fg">
              {formatBrl(totalMinBrl)} – {formatBrl(totalMaxBrl)}
            </span>
          </p>
        )}
      </WorkspacePanel>

      {(status === "pending" || status === "waiting") && cards.length === 0 ? (
        <div className="columns-1 gap-3 sm:columns-2 lg:columns-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="mb-3 break-inside-avoid">
              <div className="h-48 animate-pulse rounded-lg bg-app-surface-muted" />
            </div>
          ))}
        </div>
      ) : (
        <div className="columns-1 gap-3 sm:columns-2 lg:columns-3">
          {cards.map((card) => (
            <div key={card.id} className="mb-3 break-inside-avoid">
              <AmbienteCard
                card={card}
                imageUrls={imageUrls}
                onRefreshXray={
                  onRetryAmbienteXray
                    ? () => onRetryAmbienteXray(card.id)
                    : undefined
                }
              />
            </div>
          ))}
          <div className="mb-3 break-inside-avoid">
            <UnassignedPhotosCard imageIndices={semCategoria} imageUrls={imageUrls} />
          </div>
        </div>
      )}
    </div>
  )
}
