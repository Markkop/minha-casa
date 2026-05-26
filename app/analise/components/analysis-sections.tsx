"use client"

import { Loader2 } from "lucide-react"
import type { Imovel } from "@/app/anuncios/lib/api"
import { WorkspacePanel } from "@/app/components/workspace-ui"
import type {
  ListingAnalysisResult,
  PhotoAnalysisItem,
  ViewingQuestion,
} from "@/lib/property-analysis/types"
import { resolveListingImages } from "@/lib/listing-images"
import { cn } from "@/lib/utils"
import { RiskXrayPanel } from "./risk-xray-panel"
import { ViewingQuestionImages } from "./viewing-question-images"

const STEPS_V3 = [
  { key: "geocode", title: "Localização" },
  { key: "market", title: "Mercado" },
  { key: "inventory", title: "Inventário (fotos)" },
  { key: "photoCluster", title: "Agrupamento fotográfico" },
  { key: "spaceReconciliation", title: "Reconciliação com anúncio" },
] as const

const STEPS_V2 = [
  { key: "geocode", title: "Localização" },
  { key: "market", title: "Mercado" },
  { key: "inventory", title: "Inventário (fotos)" },
  { key: "spaceMapping", title: "Ambientes e fotos" },
] as const

const STEPS_V1 = [
  { key: "geocode", title: "Localização" },
  { key: "market", title: "Mercado" },
  { key: "photos", title: "Fotos (estrutura)" },
  { key: "viewingTips", title: "Perguntas para visita" },
] as const

function isV2Result(result: ListingAnalysisResult | null | undefined) {
  return (result?.schemaVersion ?? 1) >= 2 || result?.riskXray != null
}

function isPhotoClusterDone(completed: Set<string>) {
  return completed.has("photoCluster") || completed.has("spaceMapping")
}

function isSpaceReconciliationDone(completed: Set<string>, result?: ListingAnalysisResult | null) {
  if (completed.has("spaceReconciliation")) return true
  // Legacy v2: reconciliation was produced in spaceMapping before risk
  if ((result?.schemaVersion ?? 2) < 3 && completed.has("spaceMapping")) return true
  const status = result?.spaceAudit?.reconciliation?.matchStatus
  return status != null && status !== "pending"
}

interface AnalysisSectionsProps {
  result: ListingAnalysisResult | null
  isRunning: boolean
  listing?: Imovel | null
  className?: string
}

export function AnalysisSections({
  result,
  isRunning,
  listing,
  className,
}: AnalysisSectionsProps) {
  const listingImageUrls = listing
    ? resolveListingImages({
        listingId: listing.id,
        imageUrl: listing.imageUrl,
        imageUrls: listing.imageUrls,
        imageStorageKeys: listing.imageStorageKeys,
      }).imageUrls
    : []
  const completed = new Set(result?.completedSteps ?? [])
  const v2 = isV2Result(result)

  if (!result && !isRunning) {
    return (
      <p className={cn("text-sm text-app-muted", className)}>
        Inicie a análise profunda para ver resultados aqui.
      </p>
    )
  }

  const pipelineSteps = v2
    ? (result?.schemaVersion ?? 0) >= 3
      ? STEPS_V3
      : STEPS_V2.filter((s) => s.key !== "spaceMapping")
    : STEPS_V1

  const showRiskSection =
    v2 &&
    (hasRiskXrayContent(result) ||
      (result?.spaceAudit?.displaySpaces?.length ?? 0) > 0 ||
      (result?.spaceAudit?.spaces?.length ?? 0) > 0 ||
      isRunning)

  return (
    <div className={cn("space-y-3", className)}>
      {pipelineSteps.map(({ key, title }) => (
        <SectionCard
          key={key}
          title={title}
          done={completed.has(key)}
          pending={isRunning && !completed.has(key)}
        >
          {key === "geocode" && <GeocodeContent data={result?.geocode} />}
          {key === "market" && <MarketContent data={result?.market} />}
          {key === "inventory" && (
            <InventoryContent
              data={result?.inventory}
              totalListingPhotos={listingImageUrls.length}
            />
          )}
          {key === "photos" && <PhotosContent data={result?.photos} />}
          {key === "viewingTips" && (
            <ViewingTipsContent
              data={result?.viewingTips}
              imageUrls={listingImageUrls}
            />
          )}
        </SectionCard>
      ))}

      {showRiskSection && (
        <section className="rounded-xl border border-app-border/80 bg-app-surface/50 p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold tracking-tight text-app-fg">
              Raio-X por ambiente
            </h3>
            {(completed.has("riskXray") || hasRiskXrayContent(result)) && (
              <span className="rounded-full bg-app-bg px-2 py-0.5 text-[10px] font-medium text-app-muted">
                Pronto
              </span>
            )}
            {isRunning && !completed.has("riskXray") && !hasRiskXrayContent(result) && (
              <Loader2 className="size-3.5 animate-spin text-app-muted" />
            )}
          </div>
          <RiskXrayPanel
            data={result?.riskXray}
            spaceAudit={result?.spaceAudit}
            inventory={result?.inventory}
            imageUrls={listingImageUrls}
            isRunning={isRunning}
            inventoryDone={completed.has("inventory")}
            photoClusterDone={isPhotoClusterDone(completed)}
            spaceReconciliationDone={isSpaceReconciliationDone(completed, result)}
          />
        </section>
      )}
    </div>
  )
}

function SectionCard({
  title,
  done,
  pending,
  children,
}: {
  title: string
  done: boolean
  pending: boolean
  children: React.ReactNode
}) {
  return (
    <WorkspacePanel className="p-4">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-app-fg">{title}</h3>
        {pending && !done && (
          <Loader2 className="size-3.5 animate-spin text-app-muted" />
        )}
        {done && (
          <span className="rounded bg-app-bg px-1.5 py-0.5 text-[10px] font-medium text-app-muted">
            Pronto
          </span>
        )}
      </div>
      {done ? (
        children
      ) : pending ? (
        <p className="text-xs text-app-muted">Processando...</p>
      ) : (
        <p className="text-xs text-app-muted">Aguardando...</p>
      )}
    </WorkspacePanel>
  )
}

function hasRiskXrayContent(result: ListingAnalysisResult | null | undefined) {
  if ((result?.spaceAudit?.spaces?.length ?? 0) > 0) return true
  const envs = result?.riskXray?.environments ?? []
  return envs.some(
    (e) => (e.blindSpots?.length ?? 0) > 0 || e.status === "running" || e.status === "completed"
  )
}

function InventoryContent({
  data,
  totalListingPhotos = 0,
}: {
  data?: ListingAnalysisResult["inventory"]
  totalListingPhotos?: number
}) {
  if (!data) return null
  if (data.skipped) {
    return (
      <p className="text-sm text-app-muted">
        {data.reason === "no_images"
          ? "Nenhuma foto disponível para inventário."
          : "Inventário não realizado."}
      </p>
    )
  }
  const images = data.images ?? []
  const scenes = images
    .map((img) => img.observations?.scene)
    .filter((s): s is string => typeof s === "string" && s.trim() !== "")
  const unique = [...new Set(scenes)]
  const mapped = images.filter((img) => img.spaceId).length
  return (
    <p className="text-sm text-app-fg">
      {images.length} foto{images.length === 1 ? "" : "s"} catalogada
      {images.length === 1 ? "" : "s"}
      {unique.length > 0 && (
        <span className="text-app-muted"> · cenas: {unique.join(", ")}</span>
      )}
      {mapped > 0 && (
        <span className="text-app-muted"> · {mapped} mapeada{mapped === 1 ? "" : "s"}</span>
      )}
      {totalListingPhotos > images.length && (
        <span className="block text-xs text-app-muted">
          O imóvel tem {totalListingPhotos} fotos; nesta execução foram analisadas{" "}
          {images.length} (limite atual do servidor).
        </span>
      )}
    </p>
  )
}

function geocodeSkipMessage(data: NonNullable<ListingAnalysisResult["geocode"]>) {
  switch (data.reason) {
    case "no_address":
      return "Endereço não informado."
    case "google_not_configured":
      return "Chave Google Maps ausente no servidor. Rode pnpm run setup:analise."
    case "google_billing_required":
      return "Google Geocoding recusou a consulta (faturamento ou APIs não habilitadas no projeto da chave)."
    default:
      return "Não foi possível localizar o endereço."
  }
}

function GeocodeContent({ data }: { data?: ListingAnalysisResult["geocode"] }) {
  if (!data) return null
  if (data.skipped) {
    return (
      <div className="space-y-1 text-sm text-app-muted">
        <p>{geocodeSkipMessage(data)}</p>
        {data.hint && typeof data.hint === "string" ? (
          <p className="text-xs">{data.hint}</p>
        ) : null}
        {data.query && typeof data.query === "string" ? (
          <p className="text-xs">Consulta: {data.query}</p>
        ) : null}
      </div>
    )
  }
  return (
    <p className="text-sm text-app-fg">
      {data.formattedAddress || data.query}
      {data.lat != null && data.lng != null && (
        <span className="text-app-muted">
          {" "}
          ({data.lat}, {data.lng})
        </span>
      )}
    </p>
  )
}

function MarketContent({ data }: { data?: ListingAnalysisResult["market"] }) {
  if (!data) return null
  return (
    <div className="space-y-2 text-sm text-app-fg">
      {data.listingPriceM2 != null && (
        <p>
          Preço/m² do anúncio:{" "}
          <strong>
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
              maximumFractionDigits: 0,
            }).format(data.listingPriceM2)}
          </strong>
        </p>
      )}
      {data.regionBenchmark?.pricePerM2 != null && (
        <p>
          Referência da região ({data.regionBenchmark.neighborhood},{" "}
          {data.regionBenchmark.city}):{" "}
          {new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
            maximumFractionDigits: 0,
          }).format(data.regionBenchmark.pricePerM2)}
          /m²
          {data.deltaPercent != null && (
            <span
              className={
                data.deltaPercent > 0 ? "text-amber-700" : "text-emerald-700"
              }
            >
              {" "}
              ({data.deltaPercent > 0 ? "+" : ""}
              {data.deltaPercent}% vs região)
            </span>
          )}
        </p>
      )}
      {data.braveSummary && (
        <p className="text-app-muted">{data.braveSummary}</p>
      )}
      {(data.sources ?? []).length > 0 && (
        <ul className="list-inside list-disc text-xs text-app-muted">
          {data.sources!.slice(0, 4).map((s, i) => (
            <li key={i}>
              <a href={s.url} target="_blank" rel="noreferrer" className="underline">
                {s.title || s.url}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function truncateLegacyLabel(text: string, max = 28): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function legacyLabelsFromObservation(
  o: NonNullable<PhotoAnalysisItem["observations"]>
): string[] {
  const materials = (o.materialsSpotted ?? []).filter((s) => s.trim()).slice(0, 4)
  if (materials.length >= 2) return materials

  const rich = [
    o.floor,
    o.walls,
    o.ceiling,
    o.baseboard,
    o.layoutAnchors,
    o.wetAreaFixtures,
  ]
    .filter((s): s is string => typeof s === "string" && s.trim() !== "")
    .map(truncateLegacyLabel)

  if (rich.length > 0) return rich.slice(0, 6)
  return materials
}

function PhotoObservationDetail({
  observations,
}: {
  observations: NonNullable<PhotoAnalysisItem["observations"]>
}) {
  const o = observations
  const labels =
    (o.inventoryLabels?.length ?? 0) > 0
      ? o.inventoryLabels!
      : legacyLabelsFromObservation(o)

  const fields: [string, string | null | undefined][] = [
    ["Ambiente", o.scene],
    ["Estrutura", o.structure],
    ["Piso", o.floor],
    ["Paredes", o.walls],
    ["Teto", o.ceiling],
    ["Rodapé", o.baseboard],
    ["Esquadrias", o.openings ?? o.windows],
    ["Áreas molhadas", o.wetArea ?? o.fixtures],
    ["Louças e metais", o.wetAreaFixtures],
    ["Móveis e layout", o.layoutAnchors],
  ]

  return (
    <div className="mt-2 space-y-3 text-sm">
      {labels.length > 0 && (
        <div>
          <p className="text-xs font-medium text-app-muted">Resumo</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {labels.map((label) => (
              <span
                key={label}
                className="rounded-full bg-app-bg px-2 py-0.5 text-[10px] text-app-fg ring-1 ring-app-border/60"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
      <dl className="grid gap-2">
        {fields.map(([label, val]) =>
          val ? (
            <div key={label}>
              <dt className="text-xs font-medium text-app-muted">{label}</dt>
              <dd className="text-app-fg leading-relaxed">{val}</dd>
            </div>
          ) : null
        )}
      </dl>
      {o.materialsSpotted && o.materialsSpotted.length > 0 && (
        <div>
          <p className="text-xs font-medium text-app-muted">Materiais identificados</p>
          <ul className="mt-1 list-inside list-disc text-app-fg">
            {o.materialsSpotted.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      {o.signalsToInvestigate && o.signalsToInvestigate.length > 0 && (
        <div>
          <p className="text-xs font-medium text-amber-800">O que checar</p>
          <ul className="mt-1 list-inside list-disc text-app-fg">
            {o.signalsToInvestigate.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      {o.questionsForVisit && o.questionsForVisit.length > 0 && (
        <div>
          <p className="text-xs font-medium text-app-muted">Perguntas sugeridas nesta foto</p>
          <ul className="mt-1 list-inside list-disc text-app-fg">
            {o.questionsForVisit.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      {o.conditionNotes && !o.signalsToInvestigate?.length ? (
        <p className="text-xs text-app-muted">{o.conditionNotes}</p>
      ) : null}
    </div>
  )
}

function PhotosContent({ data }: { data?: ListingAnalysisResult["photos"] }) {
  if (!data) return null
  if (data.skipped) {
    return <p className="text-sm text-app-muted">Sem imagens para analisar.</p>
  }
  const images = data.images ?? []
  return (
    <div className="space-y-4">
      {images.map((img: PhotoAnalysisItem) => (
        <div
          key={img.index}
          className="rounded-lg border border-app-border bg-app-bg p-3"
        >
          <p className="text-xs font-medium text-app-muted">Foto {img.index + 1}</p>
          {img.error ? (
            <p className="text-sm text-destructive">
              {img.error === "openai_not_configured"
                ? "OpenAI não configurado no servidor Phoenix (defina OPENAI_API_KEY em .env e rode pnpm run setup:analise)."
                : img.error}
            </p>
          ) : img.observations ? (
            <PhotoObservationDetail observations={img.observations} />
          ) : null}
        </div>
      ))}
    </div>
  )
}

function ViewingTipsContent({
  data,
  imageUrls,
}: {
  data?: ListingAnalysisResult["viewingTips"]
  imageUrls: string[]
}) {
  if (!data?.questions?.length) {
    return <p className="text-sm text-app-muted">Nenhuma pergunta gerada.</p>
  }
  const order = { high: 0, medium: 1, low: 2 }
  const sorted = [...data.questions].sort(
    (a, b) => order[a.priority] - order[b.priority]
  )
  return (
    <ul className="space-y-3">
      {sorted.map((q: ViewingQuestion, i) => (
        <li
          key={i}
          className="rounded-lg border border-app-border bg-app-bg p-3 text-sm"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-app-muted">{q.area}</span>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase",
                q.priority === "high" && "bg-amber-100 text-amber-900",
                q.priority === "medium" && "bg-slate-100 text-slate-700",
                q.priority === "low" && "bg-slate-50 text-slate-500"
              )}
            >
              {q.priority}
            </span>
          </div>
          <p className="mt-1 font-medium text-app-fg">{q.question}</p>
          <p className="mt-1 text-app-muted">
            <span className="font-medium text-app-fg">Por quê: </span>
            {q.why}
          </p>
          {q.expectedAnswers?.length > 0 && (
            <p className="mt-1 text-xs text-app-muted">
              Respostas esperadas: {q.expectedAnswers.join("; ")}
            </p>
          )}
          {q.imageIndices && q.imageIndices.length > 0 && imageUrls.length > 0 && (
            <ViewingQuestionImages
              imageUrls={imageUrls}
              imageIndices={q.imageIndices}
            />
          )}
        </li>
      ))}
    </ul>
  )
}
