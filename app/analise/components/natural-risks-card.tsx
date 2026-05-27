"use client"

import type { RiscosSection } from "@/lib/property-analysis/types"
import type { AnalysisStepStatus } from "@/lib/property-analysis/step-status"
import { ResearchCardShell } from "./research-card-shell"

interface NaturalRisksCardProps {
  data?: RiscosSection
  status: AnalysisStepStatus
  onRefresh?: () => void
  errorMessage?: string
}

export function NaturalRisksCard({
  data,
  status,
  onRefresh,
  errorMessage,
}: NaturalRisksCardProps) {
  return (
    <ResearchCardShell
      title="Riscos Naturais"
      status={status}
      onRefresh={onRefresh}
      errorMessage={errorMessage}
    >
      {data?.skipped ? (
        <p className="text-sm text-app-muted">{data.reason ?? "Riscos indisponíveis."}</p>
      ) : data?.paragrafo ? (
        <div className="space-y-2">
          <p className="text-sm leading-relaxed text-app-fg">{data.paragrafo}</p>
          {data.tags && data.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {data.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-900 dark:text-amber-100"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </ResearchCardShell>
  )
}
