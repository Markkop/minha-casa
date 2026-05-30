"use client"

import type { Imovel } from "@/app/anuncios/lib/api"
import { useCollections } from "@/app/anuncios/lib/use-collections"
import { ListingLocationMiniMap } from "@/app/anuncios/components/listing-location-mini-map"
import { WorkspacePanel } from "@/app/components/workspace-ui"
import {
  ListingDecisionNotesProvider,
  ListingNotesCard,
  ListingProsConsCard,
} from "./listing-decision-notes"
import { ListingAnalysisSummaryCard } from "./listing-analysis-summary-card"
import { NearbyPlacesPanel } from "./nearby-places-panel"
import { PropertyImageGallery } from "./property-image-gallery"

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "" || value === "—") {
    return null
  }
  return (
    <tr className="border-b border-app-border/60 last:border-0">
      <th className="w-40 py-2 pr-4 text-left text-xs font-medium text-app-muted">
        {label}
      </th>
      <td className="py-2 text-sm text-app-fg">{value}</td>
    </tr>
  )
}

function DossierCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <WorkspacePanel className="p-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-app-muted">
        {title}
      </h3>
      <table className="w-full">
        <tbody>{children}</tbody>
      </table>
    </WorkspacePanel>
  )
}

interface PropertyDossierProps {
  listing: Imovel
  collectionId?: string | null
  orgId?: string | null
}

export function PropertyDossier({ listing, collectionId, orgId }: PropertyDossierProps) {
  const { updateListing, removeListing } = useCollections()

  return (
    <div className="space-y-4">
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <ListingAnalysisSummaryCard
          listing={listing}
          collectionId={collectionId}
          updateListing={updateListing}
          removeListing={removeListing}
        />

        <WorkspacePanel className="p-3">
          <PropertyImageGallery listing={listing} updateListing={updateListing} />
        </WorkspacePanel>
      </div>

      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <WorkspacePanel className="overflow-hidden p-0">
          <ListingLocationMiniMap
            listing={listing}
            variant="preview"
            className="aspect-square w-full min-h-[220px] sm:min-h-0"
            fallback={
              <p className="flex aspect-square min-h-[220px] items-center justify-center p-4 text-sm text-app-muted">
                Mapa indisponível. Informe endereço ou coordenadas no anúncio.
              </p>
            }
          />
        </WorkspacePanel>

        <NearbyPlacesPanel
          listing={listing}
          orgId={orgId}
          className="flex min-h-0 flex-col lg:max-h-[min(100vw,28rem)] lg:overflow-hidden"
        />
      </div>

      <ListingDecisionNotesProvider listingId={listing.id} orgId={orgId}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-4">
            <DossierCard title="Localização">
              <FieldRow label="Endereço" value={listing.endereco} />
              <FieldRow label="Bairro" value={listing.bairro} />
              <FieldRow label="Cidade" value={listing.cidade} />
              <FieldRow
                label="Coordenadas"
                value={
                  listing.customLat != null && listing.customLng != null
                    ? `${listing.customLat}, ${listing.customLng}`
                    : null
                }
              />
            </DossierCard>

            <DossierCard title="Contato">
              <FieldRow label="Nome" value={listing.contactName} />
              <FieldRow label="Telefone" value={listing.contactNumber} />
              <FieldRow label="Condomínio" value={listing.condominiumName} />
              <FieldRow
                label="Link"
                value={
                  listing.link ? (
                    <a href={listing.link} target="_blank" rel="noreferrer" className="underline">
                      Abrir anúncio
                    </a>
                  ) : null
                }
              />
            </DossierCard>
          </div>

          <div className="flex flex-col gap-4">
            <ListingProsConsCard />
          </div>
        </div>

        <ListingNotesCard />
      </ListingDecisionNotesProvider>
    </div>
  )
}
