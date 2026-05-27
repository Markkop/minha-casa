"use client"

import { Loader2, RefreshCw } from "lucide-react"
import { WorkspacePanel } from "@/app/components/workspace-ui"
import { Button } from "@/components/ui/button"
import type { AnalysisStepStatus } from "@/lib/property-analysis/step-status"
import { cn } from "@/lib/utils"

interface ResearchCardShellProps {
  title: string
  status: AnalysisStepStatus
  children?: React.ReactNode
  className?: string
  onRefresh?: () => void
  errorMessage?: string
}

function StatusBadge({ status }: { status: AnalysisStepStatus }) {
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-app-muted">
        <Loader2 className="size-3 animate-spin" />
        Processando…
      </span>
    )
  }
  if (status === "done") {
    return <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Pronto</span>
  }
  if (status === "failed") {
    return <span className="text-xs font-medium text-destructive">Falhou</span>
  }
  if (status === "incomplete") {
    return (
      <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Incompleto</span>
    )
  }
  if (status === "waiting") {
    return <span className="text-xs text-app-muted">Aguardando…</span>
  }
  return null
}

function truncateError(msg: string, max = 240): string {
  if (msg.length <= max) return msg
  return `${msg.slice(0, max - 1)}…`
}

export function ResearchCardShell({
  title,
  status,
  children,
  className,
  onRefresh,
  errorMessage,
}: ResearchCardShellProps) {
  const showSkeleton = status === "pending" || status === "waiting"
  const canRefresh = Boolean(onRefresh) && status !== "pending"

  return (
    <WorkspacePanel className={cn("flex h-full flex-col p-4", className)}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-app-fg">{title}</h3>
          {status === "failed" && errorMessage && (
            <p
              className="mt-1 text-xs text-destructive"
              title={errorMessage}
            >
              {truncateError(errorMessage)}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {canRefresh && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-app-muted hover:text-app-fg"
              onClick={onRefresh}
              aria-label={`Reexecutar ${title}`}
            >
              <RefreshCw className="size-3.5" />
            </Button>
          )}
          <StatusBadge status={status} />
        </div>
      </div>
      {showSkeleton && !children ? (
        <div className="space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-app-surface-muted" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-app-surface-muted" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-app-surface-muted" />
        </div>
      ) : (
        children
      )}
    </WorkspacePanel>
  )
}
