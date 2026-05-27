"use client"

import type { IdadeSection } from "@/lib/property-analysis/types"
import type { AnalysisStepStatus } from "@/lib/property-analysis/step-status"
import { ResearchCardShell } from "./research-card-shell"

interface PropertyAgeCardProps {
  data?: IdadeSection
  status: AnalysisStepStatus
  onRefresh?: () => void
  errorMessage?: string
}

export function PropertyAgeCard({
  data,
  status,
  onRefresh,
  errorMessage,
}: PropertyAgeCardProps) {
  const waitingAmbientes = status === "waiting"

  return (
    <ResearchCardShell
      title="Idade do Imóvel"
      status={status}
      onRefresh={onRefresh}
      errorMessage={errorMessage}
    >
      {waitingAmbientes ? (
        <p className="text-sm text-app-muted">
          Aguardando reconhecimento dos ambientes…
        </p>
      ) : data?.skipped ? (
        <p className="text-sm text-app-muted">{data.reason ?? "Estimativa indisponível."}</p>
      ) : data ? (
        <div className="space-y-2">
          {(data.estimativaAnos != null || data.faixaAnos) && (
            <p className="text-sm font-medium text-app-fg">
              {data.estimativaAnos != null && `~${data.estimativaAnos} anos`}
              {data.faixaAnos &&
                ` (${data.faixaAnos.min}–${data.faixaAnos.max} anos)`}
            </p>
          )}
          {data.resumo && (
            <p className="text-sm leading-relaxed text-app-fg">{data.resumo}</p>
          )}
          {data.sinaisVistos && data.sinaisVistos.length > 0 && (
            <ul className="list-inside list-disc text-xs text-app-muted">
              {data.sinaisVistos.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </ResearchCardShell>
  )
}
