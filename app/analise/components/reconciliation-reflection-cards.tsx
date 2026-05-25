"use client"

import type { SpaceReconciliation } from "@/lib/property-analysis/types"
import { cn } from "@/lib/utils"

function insightPhrases(rec?: SpaceReconciliation | null): string[] {
  if (!rec) return []

  const phrases: string[] = []

  if (rec.detectedSummary?.trim()) phrases.push(rec.detectedSummary.trim())
  if (rec.listingSummary?.trim()) {
    phrases.push(`Anúncio: ${rec.listingSummary.trim()}`)
  }
  if (rec.photoCoverage?.trim()) phrases.push(rec.photoCoverage.trim())

  for (const r of rec.reflections ?? []) {
    const t = r?.trim()
    if (t) phrases.push(t)
  }

  return phrases
}

interface ReconciliationReflectionCardsProps {
  reconciliation?: SpaceReconciliation | null
  className?: string
}

export function ReconciliationReflectionCards({
  reconciliation,
  className,
}: ReconciliationReflectionCardsProps) {
  const phrases = insightPhrases(reconciliation)
  if (phrases.length === 0) return null

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-app-muted">
        Conclusões do mapeamento
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {phrases.map((phrase, i) => (
          <div
            key={i}
            className="min-w-[min(100%,220px)] max-w-xs shrink-0 rounded-lg border border-app-border/80 bg-app-bg/60 px-3 py-2 text-xs leading-snug text-app-fg shadow-sm"
          >
            {phrase}
          </div>
        ))}
      </div>
    </div>
  )
}
