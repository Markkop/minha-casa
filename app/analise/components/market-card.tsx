"use client"

import type { MercadoSection } from "@/lib/property-analysis/types"
import type { AnalysisStepStatus } from "@/lib/property-analysis/step-status"
import { ResearchCardShell } from "./research-card-shell"

interface MarketCardProps {
  data?: MercadoSection
  status: AnalysisStepStatus
  onRefresh?: () => void
  errorMessage?: string
}

function formatM2(value?: number) {
  if (value == null || Number.isNaN(value)) return null
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value)
}

export function MarketCard({
  data,
  status,
  onRefresh,
  errorMessage,
}: MarketCardProps) {
  const prices = data
    ? [
        { label: "Bairro", value: data.precoRegiaoM2 },
        { label: "Similares", value: data.precoSimilaresM2 },
        { label: "Cidade", value: data.precoCidadeM2 },
        { label: "Anúncio", value: data.precoAnuncioM2 },
      ].filter((p) => p.value != null)
    : []

  return (
    <ResearchCardShell
      title="Mercado"
      status={status}
      onRefresh={onRefresh}
      errorMessage={errorMessage}
    >
      {data?.skipped ? (
        <p className="text-sm text-app-muted">{data.reason ?? "Mercado indisponível."}</p>
      ) : data ? (
        <div className="space-y-3">
          {data.paragrafo && (
            <p className="text-sm leading-relaxed text-app-fg">{data.paragrafo}</p>
          )}
          {prices.length > 0 && (
            <dl className="grid grid-cols-2 gap-2 text-xs">
              {prices.map(({ label, value }) => (
                <div key={label} className="rounded-md bg-app-surface-muted px-2 py-1.5">
                  <dt className="text-app-muted">{label} / m²</dt>
                  <dd className="font-medium text-app-fg">{formatM2(value)}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      ) : null}
    </ResearchCardShell>
  )
}
