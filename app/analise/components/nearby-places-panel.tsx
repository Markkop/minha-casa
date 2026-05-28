"use client"

import { Loader2 } from "lucide-react"
import type { Imovel } from "@/app/anuncios/lib/api"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WorkspacePanel } from "@/app/components/workspace-ui"
import { useListingNearby } from "@/lib/listing-nearby/use-listing-nearby"
import type { NearbyPlace, NearbySection } from "@/lib/property-analysis/types"
import { cn } from "@/lib/utils"
import { buildGeneralNearbyPreview } from "./nearby-places-helpers"

const GENERAL_TAB_ID = "general"

const pillTabTriggerClassName =
  "inline-flex h-5 w-auto flex-none rounded-full border border-app-border bg-app-bg px-2 py-0 text-[10px] font-medium leading-5 text-app-muted shadow-none data-[state=active]:border-app-fg data-[state=active]:bg-app-fg data-[state=active]:text-app-bg dark:data-[state=active]:text-app-fg"

interface NearbyPlacesPanelProps {
  listing: Imovel
  orgId?: string | null
  className?: string
}

export function NearbyPlacesPanel({
  listing,
  orgId,
  className,
}: NearbyPlacesPanelProps) {
  const { nearby, isLoading, error } = useListingNearby(listing.id, orgId)

  const showTabs = !error && !isLoading && nearby && !nearby.skipped && (nearby.categories?.length ?? 0) > 0

  return (
    <WorkspacePanel className={cn("overflow-hidden p-0", className)}>
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-app-muted">
          Proximidades
        </h3>
        {isLoading && <Loader2 className="size-3.5 animate-spin text-app-muted" />}
      </div>

      {error && (
        <p className="px-4 pb-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {!error && isLoading && !nearby && (
        <p className="px-4 pb-4 text-sm text-app-muted">Carregando lugares próximos...</p>
      )}

      {!error && !isLoading && !showTabs && (
        <div className="px-4 pb-4">
          <NearbyPlacesContent data={nearby} />
        </div>
      )}

      {!error && showTabs && nearby && (
        <NearbyPlacesTabs data={nearby} />
      )}
    </WorkspacePanel>
  )
}

function NearbyPlacesTabs({ data }: { data: NearbySection }) {
  const categories = data.categories ?? []
  const generalPreview = buildGeneralNearbyPreview(categories)

  return (
    <Tabs defaultValue={GENERAL_TAB_ID} className="gap-0">
      <TabsList className="h-auto w-full flex flex-wrap content-start justify-start gap-1 rounded-none bg-transparent px-4 pb-2">
        <TabsTrigger value={GENERAL_TAB_ID} className={pillTabTriggerClassName}>
          Geral
        </TabsTrigger>
        {categories.map((cat) => (
          <TabsTrigger key={cat.id} value={cat.id} className={pillTabTriggerClassName}>
            {cat.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value={GENERAL_TAB_ID} className="px-4 pb-3 pt-0">
        {generalPreview.length === 0 ? (
          <p className="text-sm text-app-muted">Nenhum lugar encontrado.</p>
        ) : (
          <NearbyPlacesList places={generalPreview.map(({ place }) => place)} />
        )}
      </TabsContent>

      {categories.map((cat) => (
        <TabsContent key={cat.id} value={cat.id} className="px-4 pb-3 pt-0">
          <NearbyPlacesList
            places={cat.places ?? []}
            emptyMessage="Nenhum lugar nesta categoria."
          />
        </TabsContent>
      ))}
    </Tabs>
  )
}

export function NearbyPlacesContent({ data }: { data?: NearbySection | null }) {
  if (!data) return null
  if (data.skipped) {
    return (
      <div className="space-y-1 text-sm text-app-muted">
        <p>
          {data.reason === "google_billing_required"
            ? "Google Places indisponível — ative faturamento e a Places API no projeto da chave."
            : data.reason === "no_coordinates"
              ? "Defina o endereço ou pin no mapa do imóvel para ver proximidades."
              : data.reason === "google_not_configured"
                ? "Chave Google Maps ausente no servidor."
                : "Proximidades não disponíveis."}
        </p>
        {data.hint && typeof data.hint === "string" ? (
          <p className="text-xs">{data.hint}</p>
        ) : null}
      </div>
    )
  }

  const categories = data.categories ?? []
  if (categories.length === 0) {
    return <p className="text-sm text-app-muted">Nenhum lugar encontrado.</p>
  }

  return null
}

function NearbyPlacesList({
  places,
  emptyMessage = "Nenhum lugar encontrado.",
}: {
  places: NearbyPlace[]
  emptyMessage?: string
}) {
  if (places.length === 0) {
    return <p className="text-sm text-app-muted">{emptyMessage}</p>
  }

  return (
    <ul className="space-y-0.5">
      {places.map((place, i) => (
        <li key={i} className="text-xs text-app-fg">
          <NearbyPlaceRow place={place} />
        </li>
      ))}
    </ul>
  )
}

function NearbyPlaceRow({ place }: { place: NearbyPlace }) {
  return (
    <>
      {place.mapsUrl ? (
        <a
          href={place.mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          {place.name}
        </a>
      ) : (
        place.name
      )}
      {place.vicinity && (
        <span className="text-app-muted"> — {place.vicinity}</span>
      )}
      {place.rating != null && (
        <span className="text-app-muted"> · ★ {place.rating}</span>
      )}
    </>
  )
}
