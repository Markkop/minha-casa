"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import type {
  BlindSpot,
  EnvironmentRiskXray,
  InventorySection,
  PhotoAnalysisItem,
  PhotoObservation,
  RiskXraySection,
  SpaceAuditSection,
} from "@/lib/property-analysis/types"
import { slugSpaceId } from "./space-slug"
import { RoomCardPhoto } from "./room-card-photo"
import {
  displayStackGroupKey,
  isExteriorGarageScene,
  themeForScene,
  type SceneTheme,
} from "./room-scene-theme"
import { cn } from "@/lib/utils"

export interface RoomCardModel {
  spaceId: string
  label: string
  scene: string
  imageIndices: number[]
  listingRole?: string | null
  risk?: EnvironmentRiskXray
  /** Inventário factual das fotos (disponível antes do raio-X) */
  photoInventory?: string[]
}

function enrichRiskWithPhotoInventory(
  risk: EnvironmentRiskXray | undefined,
  photoInventory: string[]
): EnvironmentRiskXray | undefined {
  if (!risk) return undefined
  const existing = risk.inventory?.items ?? []
  if (existing.length > 0) return risk
  if (photoInventory.length === 0) return risk
  return {
    ...risk,
    inventory: { items: photoInventory },
  }
}

const MAX_CARD_LABELS = 12

function truncateLegacyLabel(text: string, max = 28): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function legacyLabelsFromObs(obs: PhotoObservation): string[] {
  const materials = (obs.materialsSpotted ?? []).filter((s) => s.trim()).slice(0, 4)
  if (materials.length >= 2) return materials

  const rich = [
    obs.floor,
    obs.walls,
    obs.ceiling,
    obs.baseboard,
    obs.wetAreaFixtures,
  ]
    .filter((s): s is string => typeof s === "string" && s.trim() !== "")
    .map(truncateLegacyLabel)

  if (rich.length > 0) return rich.slice(0, 6)
  return materials
}

function labelsFromObs(obs?: PhotoObservation | null): string[] {
  if (!obs) return []
  const explicit = (obs.inventoryLabels ?? []).filter((s) => s.trim())
  if (explicit.length > 0) return explicit
  return legacyLabelsFromObs(obs)
}

function dedupeLabelsPreserveOrder(labels: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const label of labels) {
    const key = label.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(label.trim())
  }
  return out.slice(0, MAX_CARD_LABELS)
}

function inventoryFromImages(
  imageIndices: number[],
  images: PhotoAnalysisItem[]
): string[] {
  return dedupeLabelsPreserveOrder(
    imageIndices.flatMap((idx) => {
      const img = images.find((i) => i.index === idx)
      return labelsFromObs(img?.observations)
    })
  )
}

function collectAssignedIndices(
  spaceAudit?: SpaceAuditSection | null,
  riskXray?: RiskXraySection | null
): Set<number> {
  const assigned = new Set<number>()
  const spaces =
    spaceAudit?.displaySpaces ??
    spaceAudit?.spaces?.filter((s) => s.visible !== false) ??
    []

  for (const space of spaces) {
    for (const idx of space.imageIndices ?? []) {
      if (typeof idx === "number") assigned.add(idx)
    }
  }

  for (const env of riskXray?.environments ?? []) {
    for (const idx of env.imageIndices ?? []) {
      if (typeof idx === "number") assigned.add(idx)
    }
  }

  return assigned
}

export function buildUnassignedIndices(
  inventory?: InventorySection | null,
  spaceAudit?: SpaceAuditSection | null,
  riskXray?: RiskXraySection | null,
  imageUrlsLength = 0
): number[] {
  const assigned = collectAssignedIndices(spaceAudit, riskXray)
  const images = inventory?.images ?? []

  const unassigned = images
    .filter((img) => !img.error && img.observations)
    .map((img) => img.index)
    .filter((idx) => !assigned.has(idx))
    .filter((idx) => idx >= 0 && (imageUrlsLength === 0 || idx < imageUrlsLength))
    .sort((a, b) => a - b)

  return unassigned
}

export function buildRoomCards(
  spaceAudit?: SpaceAuditSection | null,
  riskXray?: RiskXraySection | null,
  inventory?: InventorySection | null
): RoomCardModel[] {
  const envByKey = new Map<string, EnvironmentRiskXray>()
  const catalogImages = inventory?.images ?? []

  for (const env of riskXray?.environments ?? []) {
    const key = env.spaceId ? slugSpaceId(env.spaceId) : null
    if (key) envByKey.set(key, env)
  }

  const spaces =
    spaceAudit?.displaySpaces ??
    spaceAudit?.spaces?.filter((s) => s.visible !== false) ??
    []

  if (spaces.length > 0) {
    return mergeExteriorDisplayCards(
      spaces.map((space) => {
        const key = slugSpaceId(space.spaceId)
        const risk = envByKey.get(key)
        const imageIndices = space.imageIndices ?? risk?.imageIndices ?? []
        const photoInventory = inventoryFromImages(imageIndices, catalogImages)

        return {
          spaceId: key,
          label: space.label,
          scene: space.scene,
          imageIndices,
          listingRole: space.listingRole,
          risk: enrichRiskWithPhotoInventory(risk, photoInventory),
          photoInventory,
        }
      })
    )
  }

  return mergeExteriorDisplayCards(
    (riskXray?.environments ?? []).map((env) => {
      const imageIndices = env.imageIndices ?? []
      const photoInventory = inventoryFromImages(imageIndices, catalogImages)

      return {
        spaceId: env.spaceId ?? env.scene,
        label: env.label,
        scene: env.scene,
        imageIndices,
        listingRole: env.listingRole,
        risk: enrichRiskWithPhotoInventory(env, photoInventory),
        photoInventory,
      }
    })
  )
}

const DISPLAY_EXTERIOR_ID = "display:externo-garagem"

function mergeExteriorDisplayCards(cards: RoomCardModel[]): RoomCardModel[] {
  const exterior = cards.filter((c) => isExteriorGarageScene(c.scene))
  const rest = cards.filter((c) => !isExteriorGarageScene(c.scene))
  if (exterior.length <= 1) return cards

  const imageIndices = [
    ...new Set(exterior.flatMap((c) => c.imageIndices)),
  ].sort((a, b) => a - b)

  const risks = exterior.map((c) => c.risk).filter((r): r is EnvironmentRiskXray => !!r)

  const photoInventory = [
    ...new Set(exterior.flatMap((c) => c.photoInventory ?? [])),
  ]

  return [
    ...rest,
    {
      spaceId: DISPLAY_EXTERIOR_ID,
      label: "Área externa / Garagem",
      scene: "area externa",
      imageIndices,
      listingRole: "externo",
      risk: combineExteriorRisks(risks, imageIndices),
      photoInventory,
    },
  ]
}

function combineExteriorRisks(
  risks: EnvironmentRiskXray[],
  imageIndices: number[]
): EnvironmentRiskXray | undefined {
  if (risks.length === 0) return undefined

  const blindSpots = risks.flatMap((r) => r.blindSpots ?? [])
  const inventoryItems = [
    ...new Set(risks.flatMap((r) => r.inventory?.items ?? [])),
  ]

  const status = combinedStatus(risks.map((r) => r.status))

  return {
    spaceId: DISPLAY_EXTERIOR_ID,
    scene: "area externa",
    label: "Área externa / Garagem",
    imageIndices,
    listingRole: "externo",
    status,
    blindSpots,
    inventory: { items: inventoryItems },
    agents: risks[risks.length - 1]?.agents,
  }
}

function combinedStatus(
  statuses: Array<EnvironmentRiskXray["status"] | undefined>
): EnvironmentRiskXray["status"] {
  if (statuses.some((s) => s === "running")) return "running"
  if (statuses.some((s) => s === "failed")) return "failed"
  if (statuses.length > 0 && statuses.every((s) => s === "completed")) return "completed"
  if (statuses.some((s) => s === "pending")) return "pending"
  return "pending"
}

interface RoomCardGroup {
  groupKey: string
  theme: SceneTheme
  cards: RoomCardModel[]
}

function groupRoomCards(cards: RoomCardModel[]): RoomCardGroup[] {
  const map = new Map<string, RoomCardModel[]>()

  for (const card of cards) {
    if (card.spaceId === DISPLAY_EXTERIOR_ID) {
      map.set(DISPLAY_EXTERIOR_ID, [card])
      continue
    }
    const key = displayStackGroupKey(card.scene, card.listingRole)
    map.set(key, [...(map.get(key) ?? []), card])
  }

  return [...map.entries()].map(([groupKey, groupCards]) => ({
    groupKey,
    theme: themeForScene(groupKey),
    cards: groupCards,
  }))
}

function isDisplayableCard(card: RoomCardModel): boolean {
  const hasPhotos = card.imageIndices.length > 0
  const hasInventory =
    (card.photoInventory?.length ?? 0) > 0 ||
    (card.risk?.inventory?.items?.length ?? 0) > 0
  const hasRisk =
    (card.risk?.blindSpots?.length ?? 0) > 0 ||
    card.risk?.status === "running" ||
    card.risk?.status === "pending"
  return hasPhotos && (hasInventory || hasRisk)
}

interface RoomCardsGridProps {
  spaceAudit?: SpaceAuditSection | null
  riskXray?: RiskXraySection | null
  inventory?: InventorySection | null
  imageUrls: string[]
  isRunning?: boolean
  className?: string
}

export function RoomCardsGrid({
  spaceAudit,
  riskXray,
  inventory,
  imageUrls,
  isRunning = false,
  className,
}: RoomCardsGridProps) {
  const allCards = useMemo(
    () => buildRoomCards(spaceAudit, riskXray, inventory),
    [spaceAudit, riskXray, inventory]
  )
  const cards = useMemo(
    () => allCards.filter(isDisplayableCard),
    [allCards]
  )
  const groups = useMemo(() => groupRoomCards(cards), [cards])
  const unassignedIndices = useMemo(
    () =>
      buildUnassignedIndices(
        inventory,
        spaceAudit,
        riskXray,
        imageUrls.length
      ),
    [inventory, spaceAudit, riskXray, imageUrls.length]
  )

  if (cards.length === 0 && unassignedIndices.length === 0) {
    if (isRunning) {
      return (
        <p className="flex items-center gap-2 text-sm text-app-muted">
          <Loader2 className="size-4 animate-spin" />
          Preparando cartões por ambiente...
        </p>
      )
    }
    return (
      <p className="text-sm text-app-muted">
        Nenhum ambiente mapeado ainda. Conclua o inventário e o mapeamento de fotos.
      </p>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      <p className="text-xs text-app-muted">
        {[
          cards.length > 0
            ? `${cards.length} ambiente${cards.length === 1 ? "" : "s"} · mesma cor = mesmo tipo · pilhas = vários do mesmo tipo`
            : null,
          unassignedIndices.length > 0
            ? `${unassignedIndices.length} foto${unassignedIndices.length === 1 ? "" : "s"} em Outros`
            : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>

      <div className="columns-1 gap-3 sm:columns-2 lg:columns-3 [column-fill:balance]">
        {groups.map((group) =>
          group.cards.length > 1 ? (
            <RoomFolderStack
              key={group.groupKey}
              group={group}
              imageUrls={imageUrls}
              isRunning={isRunning}
              className="mb-3 break-inside-avoid"
            />
          ) : (
            <RoomCard
              key={group.cards[0].spaceId}
              card={group.cards[0]}
              theme={group.theme}
              imageUrls={imageUrls}
              isRunning={isRunning}
              className="mb-3 break-inside-avoid"
            />
          )
        )}
        {unassignedIndices.length > 0 && (
          <UnassignedPhotosCard
            imageIndices={unassignedIndices}
            imageUrls={imageUrls}
            className="mb-3 break-inside-avoid"
          />
        )}
      </div>
    </div>
  )
}

function InventoryLabelChips({ labels }: { labels: string[] }) {
  if (labels.length === 0) return null
  return (
    <div className="border-b border-app-border/50 bg-app-bg/30 px-2.5 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-app-muted">
        Inventário
      </p>
      <div className="mt-1 flex flex-wrap gap-1">
        {labels.map((label) => (
          <span
            key={label}
            className="rounded-full bg-app-surface px-1.5 py-0.5 text-[10px] text-app-fg ring-1 ring-app-border/50"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

function UnassignedPhotosCard({
  imageIndices,
  imageUrls,
  className,
}: {
  imageIndices: number[]
  imageUrls: string[]
  className?: string
}) {
  const theme = themeForScene("outros")

  return (
    <article
      aria-label="Fotos não atribuídas a um ambiente"
      className={cn(
        "overflow-hidden rounded-xl border border-app-border/80 bg-app-surface shadow-sm ring-1",
        theme.ring,
        className
      )}
    >
      <RoomCardPhoto imageUrls={imageUrls} imageIndices={imageIndices} />
    </article>
  )
}

function RoomFolderStack({
  group,
  imageUrls,
  isRunning = false,
  className,
}: {
  group: RoomCardGroup
  imageUrls: string[]
  isRunning?: boolean
  className?: string
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const safeIndex = Math.min(activeIndex, group.cards.length - 1)
  const active = group.cards[safeIndex]
  const stackDepth = Math.min(group.cards.length - 1, 2)

  return (
    <div className={cn("relative", className)}>
      {stackDepth > 0 &&
        [...Array(stackDepth)].map((_, i) => (
          <div
            key={i}
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-x-0 top-0 rounded-xl border",
              group.theme.stack,
              i === 0 && "translate-x-1.5 -translate-y-1.5",
              i === 1 && "translate-x-3 -translate-y-3"
            )}
            style={{ height: "calc(100% - 6px)" }}
          />
        ))}

      <div className="relative z-10 space-y-1.5">
        <div className="flex flex-wrap gap-1 px-0.5">
          {group.cards.map((card, i) => (
            <button
              key={card.spaceId}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium transition",
                i === safeIndex ? group.theme.tabActive : group.theme.tab
              )}
            >
              {card.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-1 px-0.5">
          <span className="text-[10px] font-medium text-app-muted">
            {safeIndex + 1} de {group.cards.length} · {group.theme.label}
          </span>
          <div className="flex gap-0.5">
            <button
              type="button"
              className="rounded p-0.5 text-app-muted hover:bg-app-bg disabled:opacity-30"
              disabled={safeIndex === 0}
              onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
              aria-label="Ambiente anterior na pilha"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <button
              type="button"
              className="rounded p-0.5 text-app-muted hover:bg-app-bg disabled:opacity-30"
              disabled={safeIndex >= group.cards.length - 1}
              onClick={() => setActiveIndex((i) => Math.min(group.cards.length - 1, i + 1))}
              aria-label="Próximo ambiente na pilha"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>

        <RoomCard
          card={active}
          theme={group.theme}
          imageUrls={imageUrls}
          isRunning={isRunning}
        />
      </div>
    </div>
  )
}

function RoomCard({
  card,
  theme,
  imageUrls,
  isRunning = false,
  className,
}: {
  card: RoomCardModel
  theme: SceneTheme
  imageUrls: string[]
  isRunning?: boolean
  className?: string
}) {
  const env = card.risk
  const running = env?.status === "running"
  const pending = env?.status === "pending"
  const failed = env?.status === "failed"
  const spots = env?.blindSpots ?? []
  const photoLabels = card.photoInventory ?? []
  const riskItems = env?.inventory?.items ?? []
  const displayLabels =
    photoLabels.length > 0
      ? photoLabels.slice(0, MAX_CARD_LABELS)
      : riskItems.slice(0, MAX_CARD_LABELS)
  const [expanded, setExpanded] = useState(true)

  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl border border-app-border/80 bg-app-surface shadow-sm ring-1 transition hover:shadow-md",
        theme.ring,
        className
      )}
    >
      <header
        className={cn(
          "flex items-center justify-between gap-2 border-b px-2.5 py-1.5",
          theme.header
        )}
      >
        <h4 className="truncate text-[11px] font-semibold tracking-tight text-app-fg">
          {card.label}
        </h4>
        <div className="flex shrink-0 items-center gap-1">
          {running && <Loader2 className="size-3 animate-spin text-app-muted" />}
          {spots.length > 0 && (
            <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[9px] font-medium dark:bg-white/10">
              {spots.length} ponto{spots.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </header>

      <RoomCardPhoto
        imageUrls={imageUrls}
        imageIndices={card.imageIndices}
      />

      <InventoryLabelChips labels={displayLabels} />

      <div className="px-2.5 py-2">
        {running && spots.length === 0 && (
          <p className="flex items-center gap-1 text-[10px] text-app-muted">
            <Loader2 className="size-3 animate-spin" />
            Analisando riscos neste ambiente...
          </p>
        )}
        {!running && spots.length === 0 && env?.status === "completed" && (
          <p className="text-[10px] text-app-muted">Sem pontos cegos neste ambiente.</p>
        )}
        {!running && pending && spots.length === 0 && (
          <p className="text-[10px] text-app-muted">Na fila do raio-X...</p>
        )}
        {!running && !env && isRunning && (
          <p className="text-[10px] text-app-muted">Aguardando raio-X de riscos...</p>
        )}
        {!running && failed && spots.length === 0 && (
          <p className="text-[10px] text-amber-800 dark:text-amber-200">
            Raio-X não concluído neste ambiente. Atualize ou rode nova análise.
          </p>
        )}
        {spots.length > 0 && (
          <>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-1 text-left"
              onClick={() => setExpanded((e) => !e)}
            >
              <span className="text-[10px] font-semibold text-app-fg">
                Pontos cegos e visita
              </span>
              <ChevronDown
                className={cn(
                  "size-3.5 text-app-muted transition",
                  expanded && "rotate-180"
                )}
              />
            </button>
            {expanded && (
              <div className="mt-2 max-h-48 space-y-2 overflow-y-auto pr-0.5">
                {spots.map((spot, i) => (
                  <BlindSpotBlock key={`${spot.title}-${i}`} spot={spot} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </article>
  )
}

function formatBrl(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return null
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value)
}

function BlindSpotBlock({ spot }: { spot: BlindSpot }) {
  const est = spot.estimate
  const min = formatBrl(est?.costMinBrl ?? null)
  const max = formatBrl(est?.costMaxBrl ?? null)

  return (
    <div className="rounded-lg border border-app-border/60 bg-app-bg/50 p-2">
      <p className="text-[11px] font-medium leading-snug text-app-fg">{spot.title}</p>
      <p className="mt-1 text-[10px] leading-snug text-app-muted">
        <span className="font-medium text-app-fg/90">Checar: </span>
        {spot.whyCheck}
      </p>
      <p className="mt-0.5 text-[10px] leading-snug text-app-muted">
        <span className="font-medium text-app-fg/90">Visita: </span>
        {spot.visitQuestion}
      </p>
      {est?.solution && (min || max) && (
        <p className="mt-1 text-[10px] font-medium text-amber-800 dark:text-amber-200">
          {min && max ? `${min} – ${max}` : min || max}
        </p>
      )}
    </div>
  )
}
