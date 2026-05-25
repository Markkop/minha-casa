"use client"

import { Loader2 } from "lucide-react"
import type {
  InventorySection,
  RiskXraySection,
  SpaceAuditSection,
} from "@/lib/property-analysis/types"
import { ReconciliationReflectionCards } from "./reconciliation-reflection-cards"
import { RoomCardsGrid } from "./room-cards-grid"
import { SpaceReconciliationBanner } from "./space-reconciliation-banner"
import { cn } from "@/lib/utils"

function formatBrl(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return null
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value)
}

interface RiskXrayPanelProps {
  data?: RiskXraySection
  spaceAudit?: SpaceAuditSection | null
  inventory?: InventorySection | null
  imageUrls: string[]
  isRunning?: boolean
  inventoryDone?: boolean
  photoClusterDone?: boolean
  spaceReconciliationDone?: boolean
  className?: string
}

export function RiskXrayPanel({
  data,
  spaceAudit,
  inventory,
  imageUrls,
  isRunning = false,
  inventoryDone = false,
  photoClusterDone = false,
  spaceReconciliationDone = false,
  className,
}: RiskXrayPanelProps) {
  const totals = data?.totals
  const matchStatus = spaceAudit?.reconciliation?.matchStatus
  const showBanner =
    spaceReconciliationDone &&
    matchStatus &&
    matchStatus !== "match" &&
    matchStatus !== "pending"

  const spaceCount =
    spaceAudit?.displaySpaces?.length ??
    spaceAudit?.spaces?.length ??
    0

  const hasCards = spaceCount > 0 || (data?.environments?.length ?? 0) > 0

  if (data?.skipped && !hasCards) {
    return (
      <p className={cn("text-sm text-app-muted", className)}>
        {data.reason === "no_inventory"
          ? "Sem fotos analisáveis para montar o raio-X por ambiente."
          : "Raio-X indisponível nesta execução."}
      </p>
    )
  }

  if (!hasCards) {
    if (isRunning && !inventoryDone) {
      return (
        <p className={cn("text-sm text-app-muted", className)}>
          Inventariando fotos antes do raio-X de riscos...
        </p>
      )
    }
    if (isRunning && !photoClusterDone) {
      return (
        <p className={cn("flex items-center gap-2 text-sm text-app-muted", className)}>
          <Loader2 className="size-3.5 animate-spin" />
          Agrupando fotos por ambiente...
        </p>
      )
    }
    if (isRunning && !spaceReconciliationDone) {
      return (
        <p className={cn("flex items-center gap-2 text-sm text-app-muted", className)}>
          <Loader2 className="size-3.5 animate-spin" />
          Reconciliando ambientes com o anúncio...
        </p>
      )
    }
    if (isRunning) {
      return (
        <div className={cn("space-y-3", className)}>
          <RoomCardsGrid
            spaceAudit={spaceAudit}
            riskXray={data}
            inventory={inventory}
            imageUrls={imageUrls}
            isRunning={isRunning}
          />
          <p className="flex items-center gap-2 text-sm text-app-muted">
            <Loader2 className="size-3.5 animate-spin" />
            Raio-X de riscos por ambiente...
          </p>
        </div>
      )
    }
    return showBanner ? (
      <SpaceReconciliationBanner spaceAudit={spaceAudit} className={className} />
    ) : null
  }

  return (
    <div className={cn("space-y-4", className)}>
      {showBanner && <SpaceReconciliationBanner spaceAudit={spaceAudit} />}

      {(totals?.costMinBrl != null || totals?.costMaxBrl != null) &&
        (totals.costMinBrl! > 0 || totals.costMaxBrl! > 0) && (
          <div className="rounded-xl border border-amber-200/60 bg-gradient-to-r from-amber-50/80 to-transparent px-3 py-2 text-xs dark:border-amber-900/40 dark:from-amber-950/40">
            <p className="text-sm font-medium text-app-fg">
              Opex estimado se todos os riscos se confirmarem
            </p>
            <p className="text-app-muted">
              Soma de todos os ambientes: {formatBrl(totals.costMinBrl)} –{" "}
              {formatBrl(totals.costMaxBrl)}
            </p>
          </div>
        )}

      <RoomCardsGrid
        spaceAudit={spaceAudit}
        riskXray={data}
        inventory={inventory}
        imageUrls={imageUrls}
        isRunning={isRunning}
      />

      {spaceReconciliationDone && (
        <ReconciliationReflectionCards reconciliation={spaceAudit?.reconciliation} />
      )}
    </div>
  )
}
