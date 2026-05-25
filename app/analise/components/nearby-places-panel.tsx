"use client"

import { Loader2 } from "lucide-react"
import type { Imovel } from "@/app/anuncios/lib/api"
import { WorkspacePanel } from "@/app/components/workspace-ui"
import { useListingNearby } from "@/lib/listing-nearby/use-listing-nearby"
import type { NearbyCategory, NearbySection } from "@/lib/property-analysis/types"
import { cn } from "@/lib/utils"

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

  return (
    <WorkspacePanel className={cn("p-4", className)}>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-app-fg">Proximidades</h3>
        {isLoading && <Loader2 className="size-3.5 animate-spin text-app-muted" />}
      </div>
      <p className="mb-2 text-xs text-app-muted">
        Referência do entorno (cache de 7 dias). Não faz parte da análise profunda.
      </p>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {!error && !isLoading && <NearbyPlacesContent data={nearby} />}
      {!error && isLoading && !nearby && (
        <p className="text-sm text-app-muted">Carregando lugares próximos...</p>
      )}
    </WorkspacePanel>
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
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((cat: NearbyCategory) => (
        <div key={cat.id}>
          <h4 className="text-xs font-medium text-app-muted">{cat.label}</h4>
          <ul className="mt-1 space-y-0.5">
            {(cat.places ?? []).map((place, i) => (
              <li key={i} className="text-xs text-app-fg">
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
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
