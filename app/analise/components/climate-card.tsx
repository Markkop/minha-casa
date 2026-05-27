"use client"

import type { ClimaSection } from "@/lib/property-analysis/types"
import type { AnalysisStepStatus } from "@/lib/property-analysis/step-status"
import { ResearchCardShell } from "./research-card-shell"

interface ClimateCardProps {
  data?: ClimaSection
  status: AnalysisStepStatus
  onRefresh?: () => void
  errorMessage?: string
}

function StatLine({
  label,
  value,
  descricao,
}: {
  label: string
  value?: string
  descricao?: string
}) {
  return (
    <div className="border-t border-app-border pt-2 first:border-t-0 first:pt-0">
      <p className="text-xs font-medium text-app-muted">{label}</p>
      {value && <p className="mt-0.5 text-sm font-medium text-app-fg">{value}</p>}
      {descricao && <p className="mt-1 text-sm text-app-fg/90">{descricao}</p>}
    </div>
  )
}

export function ClimateCard({
  data,
  status,
  onRefresh,
  errorMessage,
}: ClimateCardProps) {
  const tempRange =
    data?.temperaturas?.minC != null && data?.temperaturas?.maxC != null
      ? `${data.temperaturas.minC}–${data.temperaturas.maxC}°C`
      : undefined

  const umidRange =
    data?.umidade?.minPct != null && data?.umidade?.maxPct != null
      ? `${data.umidade.minPct}–${data.umidade.maxPct}%`
      : undefined

  return (
    <ResearchCardShell
      title="Clima"
      status={status}
      onRefresh={onRefresh}
      errorMessage={errorMessage}
    >
      {data?.skipped ? (
        <p className="text-sm text-app-muted">{data.reason ?? "Clima indisponível."}</p>
      ) : data ? (
        <div className="space-y-3">
          {data.resumo && (
            <p className="text-sm leading-relaxed text-app-fg">{data.resumo}</p>
          )}
          <StatLine
            label="Temperaturas"
            value={tempRange}
            descricao={data.temperaturas?.descricao}
          />
          <StatLine label="Umidade" value={umidRange} descricao={data.umidade?.descricao} />
          <StatLine
            label="Chuva"
            value={
              data.chuva?.mmAnualEstimado != null
                ? `~${data.chuva.mmAnualEstimado} mm/ano`
                : undefined
            }
            descricao={data.chuva?.descricao}
          />
        </div>
      ) : null}
    </ResearchCardShell>
  )
}
