"use client"

import { Loader2, RefreshCw } from "lucide-react"
import type {
  AmbienteCard as AmbienteCardType,
  InventoryItem,
} from "@/lib/property-analysis/types"
import { buildAmbienteRotulo } from "@/lib/property-analysis/ambiente-categories"
import { WorkspacePanel } from "@/app/components/workspace-ui"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { RoomCardPhoto } from "./room-card-photo"
import { themeForCategoria } from "./room-scene-theme"

interface AmbienteCardProps {
  card: AmbienteCardType
  imageUrls: string[]
  onRefreshXray?: () => void
}

function formatBrl(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value)
}

function InventoryBadges({
  title,
  items,
}: {
  title: string
  items: InventoryItem[]
}) {
  if (items.length === 0) return null

  return (
    <div className="border-t border-app-border pt-2">
      <p className="text-xs font-medium text-app-fg">{title}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span
            key={`${item.tipo}-${i}`}
            title={item.detalhe}
            className="inline-flex max-w-full items-center rounded-full border border-app-border bg-app-surface-muted/60 px-2 py-0.5 text-[11px] leading-snug text-app-fg"
          >
            <span className="font-medium">{item.tipo}</span>
            {item.material && (
              <span className="text-app-muted"> · {item.material}</span>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}

function XrayStatusBadge({
  status,
  onRefresh,
}: {
  status?: AmbienteCardType["xrayStatus"]
  onRefresh?: () => void
}) {
  const canRefresh = Boolean(onRefresh) && status !== "pending"

  return (
    <div className="flex items-center gap-1">
      {canRefresh && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 text-app-muted hover:text-app-fg"
          onClick={onRefresh}
          aria-label="Reexecutar x-ray deste ambiente"
        >
          <RefreshCw className="size-3.5" />
        </Button>
      )}
      {status === "pending" && (
        <span className="inline-flex items-center gap-1 text-[10px] text-app-muted">
          <Loader2 className="size-3 animate-spin" />
          X-ray…
        </span>
      )}
      {status === "done" && (
        <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
          X-ray pronto
        </span>
      )}
      {status === "failed" && (
        <span className="text-[10px] font-medium text-destructive">X-ray falhou</span>
      )}
    </div>
  )
}

function PontosSkeleton() {
  return (
    <ul className="mt-2 space-y-2">
      {[1, 2, 3].map((i) => (
        <li
          key={i}
          className="h-14 animate-pulse rounded-md border border-app-border bg-app-surface-muted/50"
        />
      ))}
    </ul>
  )
}

export function AmbienteCard({ card, imageUrls, onRefreshXray }: AmbienteCardProps) {
  const theme = themeForCategoria(card.categoria)
  const rotulo = buildAmbienteRotulo(card)
  const pontos = card.pontosAtencao ?? []
  const xrayStatus = card.xrayStatus ?? "waiting"
  const instalacoesMoveis = [
    ...(card.instalacoes ?? []),
    ...(card.moveis ?? []),
  ]

  return (
    <WorkspacePanel
      className={cn("overflow-hidden border p-0", theme.ring)}
    >
      <div className={cn("border-b px-3 py-2", theme.header)}>
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-app-fg">{rotulo}</h4>
          <XrayStatusBadge status={xrayStatus} onRefresh={onRefreshXray} />
        </div>
      </div>

      <RoomCardPhoto
        imageUrls={imageUrls}
        imageIndices={card.imageIndices}
        className="rounded-none border-0"
      />

      <div className="space-y-2 px-3 pb-3">
        <InventoryBadges title="Estrutura" items={card.estrutura ?? []} />
        <InventoryBadges
          title="Instalações / Móveis"
          items={instalacoesMoveis}
        />

        <div className="border-t border-app-border pt-2">
          <p className="text-xs font-medium text-app-fg">Pontos de Atenção</p>

          {xrayStatus === "waiting" && (
            <p className="mt-2 text-xs text-app-muted">
              Aguardando análise do ambiente…
            </p>
          )}

          {xrayStatus === "pending" && <PontosSkeleton />}

          {xrayStatus === "failed" && (
            <div className="mt-2 space-y-2">
              {card.xrayError && (
                <p className="text-xs text-destructive" title={card.xrayError}>
                  {card.xrayError.length > 200
                    ? `${card.xrayError.slice(0, 199)}…`
                    : card.xrayError}
                </p>
              )}
            </div>
          )}

          {xrayStatus === "done" && pontos.length > 0 && (
            <ul className="mt-2 space-y-3">
              {pontos.map((ponto) => (
                <li
                  key={ponto.id}
                  className="rounded-md border border-app-border bg-app-surface-muted/50 p-2"
                >
                  <p className="text-xs font-medium text-app-fg">{ponto.titulo}</p>
                  <p className="mt-0.5 text-xs text-app-muted">{ponto.descricao}</p>
                  <p className="mt-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                    {formatBrl(ponto.custoMinBrl)} – {formatBrl(ponto.custoMaxBrl)}
                    {ponto.detalhes && (
                      <span className="ml-1 font-normal text-app-muted">
                        · {ponto.detalhes}
                      </span>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </WorkspacePanel>
  )
}
