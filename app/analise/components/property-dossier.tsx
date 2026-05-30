"use client"

import Link from "next/link"
import type { Imovel } from "@/app/anuncios/lib/api"
import { ListingLocationMiniMap } from "@/app/anuncios/components/listing-location-mini-map"
import { WorkspacePanel } from "@/app/components/workspace-ui"
import {
  ListingDecisionNotesProvider,
  ListingNotesCard,
  ListingProsConsCard,
} from "./listing-decision-notes"
import { NearbyPlacesPanel } from "./nearby-places-panel"
import { PropertyImageGallery } from "./property-image-gallery"

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "—"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value)
}

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
  updateListing?: (listingId: string, updates: Partial<Imovel>) => Promise<Imovel>
}

export function PropertyDossier({
  listing,
  collectionId,
  orgId,
  updateListing,
}: PropertyDossierProps) {
  const area = listing.m2Privado ?? listing.m2Totais

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <WorkspacePanel className="p-3">
          <PropertyImageGallery listing={listing} updateListing={updateListing} />
        </WorkspacePanel>

        <WorkspacePanel className="p-4">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-app-fg">{listing.titulo}</h2>
              <p className="text-sm text-app-muted">
                {[listing.endereco, listing.bairro, listing.cidade]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <Link
              href={
                collectionId
                  ? `/anuncios?collection=${collectionId}&listing=${listing.id}`
                  : "/anuncios"
              }
              className="text-xs font-medium text-app-fg underline"
            >
              Editar em Anúncios
            </Link>
          </div>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              ["Preço", formatCurrency(listing.preco)],
              ["Área", area ? `${area} m²` : "—"],
              ["Quartos", listing.quartos ?? "—"],
              ["Suítes", listing.suites ?? "—"],
              ["Banheiros", listing.banheiros ?? "—"],
              ["Garagem", listing.garagem ?? "—"],
              ["Tipo", listing.tipoImovel ?? "—"],
              ["Preço/m²", listing.precoM2 ? formatCurrency(listing.precoM2) : "—"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-app-border bg-app-bg px-3 py-2">
                <dt className="text-xs text-app-muted">{label}</dt>
                <dd className="text-sm font-medium text-app-fg">{value}</dd>
              </div>
            ))}
          </dl>
        </WorkspacePanel>

        <WorkspacePanel className="overflow-hidden p-0">
          <ListingLocationMiniMap
            listing={listing}
            variant="preview"
            className="h-full min-h-[220px] w-full"
            fallback={
              <p className="p-4 text-sm text-app-muted">
                Mapa indisponível. Informe endereço ou coordenadas no anúncio.
              </p>
            }
          />
        </WorkspacePanel>
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

            <NearbyPlacesPanel listing={listing} orgId={orgId} className="flex-1" />
          </div>

          <div className="flex flex-col gap-4">
            <DossierCard title="Comodidades">
              <FieldRow label="Piscina" value={boolLabel(listing.piscina)} />
              <FieldRow label="Porteiro 24h" value={boolLabel(listing.porteiro24h)} />
              <FieldRow label="Academia" value={boolLabel(listing.academia)} />
              <FieldRow label="Vista livre" value={boolLabel(listing.vistaLivre)} />
              <FieldRow label="Piscina térmica" value={boolLabel(listing.piscinaTermica)} />
            </DossierCard>

            <DossierCard title="Status">
              <FieldRow label="Favorito" value={listing.starred ? "Sim" : "Não"} />
              <FieldRow label="Visitado" value={listing.visited ? "Sim" : "Não"} />
              <FieldRow label="Descartado" value={listing.strikethrough ? "Sim" : "Não"} />
              <FieldRow label="Status" value={listing.listingStatus} />
            </DossierCard>

            <ListingProsConsCard />
          </div>
        </div>

        <ListingNotesCard />
      </ListingDecisionNotesProvider>
    </div>
  )
}

function boolLabel(value: boolean | null | undefined) {
  if (value === true) return "Sim"
  if (value === false) return "Não"
  return null
}
