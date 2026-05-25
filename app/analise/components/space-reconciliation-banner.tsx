"use client"

import type { SpaceAuditSection } from "@/lib/property-analysis/types"
import { cn } from "@/lib/utils"

interface SpaceReconciliationBannerProps {
  spaceAudit?: SpaceAuditSection | null
  className?: string
}

export function SpaceReconciliationBanner({
  spaceAudit,
  className,
}: SpaceReconciliationBannerProps) {
  const rec = spaceAudit?.reconciliation
  if (!rec || rec.matchStatus === "match") return null

  const missing = rec.missing ?? []
  const extra = rec.extra ?? []
  if (missing.length === 0 && extra.length === 0) return null

  return (
    <div
      role="status"
      className={cn(
        "rounded-lg border border-amber-200/60 bg-amber-50/50 px-3 py-2 text-xs text-app-fg dark:border-amber-900/40 dark:bg-amber-950/30",
        className
      )}
    >
      <p className="text-sm font-medium">Divergências anúncio vs fotos</p>
      {(missing.length > 0 || extra.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {missing.map((m, i) => (
            <span
              key={`m-${i}`}
              className="rounded bg-amber-100/80 px-1.5 py-0.5 text-[10px] font-medium text-amber-950 dark:bg-amber-900/50 dark:text-amber-100"
            >
              Falta: {m.label ?? m.type}
            </span>
          ))}
          {extra.map((e, i) => (
            <span
              key={`e-${i}`}
              className="rounded bg-app-bg px-1.5 py-0.5 text-[10px] font-medium text-app-muted"
            >
              Extra: {e.label ?? e.type}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
