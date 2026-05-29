"use client"

import { useCallback, useMemo, useState } from "react"
import Link from "next/link"
import { Suspense } from "react"
import { useCollections } from "@/app/anuncios/lib/use-collections"
import type { Imovel } from "@/app/anuncios/lib/api"
import {
  PageToolbar,
  PageToolbarStart,
} from "@/app/components/page-toolbar"
import { useWorkspaceProfile } from "@/lib/workspace/use-workspace-profile"
import { AnaliseQuerySync } from "./components/analise-query-sync"
import { DeepAnalysisPanel } from "./components/deep-analysis-panel"
import { ListingSelector } from "./components/listing-selector"
import { PropertyDossier } from "./components/property-dossier"

function AnaliseClientInner() {
  const { orgId } = useWorkspaceProfile()
  const {
    listings,
    activeCollection,
    isLoadingListings,
  } = useCollections()
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null)

  const sortedListings = useMemo(
    () =>
      [...listings]
        .filter((l) => !l.strikethrough)
        .sort((a, b) => (a.titulo ?? "").localeCompare(b.titulo ?? "", "pt-BR")),
    [listings]
  )

  const selectedListing = useMemo(() => {
    if (isLoadingListings) return null
    return (
      sortedListings.find((listing) => listing.id === selectedListingId) ||
      sortedListings[0] ||
      null
    )
  }, [isLoadingListings, selectedListingId, sortedListings])

  const handleListingSelect = useCallback((listing: Imovel) => {
    setSelectedListingId(listing.id)
  }, [])

  const toolbarCompact = Boolean(selectedListing)

  return (
    <div className="min-h-[calc(100vh-104px)] bg-app-bg text-app-fg">
      <AnaliseQuerySync onListingSelect={handleListingSelect} />

      <PageToolbar maxWidthClassName="max-w-[1500px]">
        <div className="flex w-full min-w-0 flex-col gap-1.5 md:flex-row md:items-center md:justify-between md:gap-x-4">
          <PageToolbarStart className="md:order-1 md:min-w-0 md:flex-1">
            {toolbarCompact ? (
              <ListingSelector
                listings={sortedListings}
                selectedId={selectedListing?.id ?? null}
                onSelect={handleListingSelect}
                compact
              />
            ) : (
              <ListingSelector
                listings={sortedListings}
                selectedId={selectedListing?.id ?? null}
                onSelect={handleListingSelect}
              />
            )}
          </PageToolbarStart>
        </div>
      </PageToolbar>

      <div className="mx-auto w-full max-w-[1500px] space-y-6 px-4 py-4">
        {!activeCollection ? (
          <p className="text-sm text-app-muted">
            Crie uma coleção em{" "}
            <Link href="/anuncios" className="font-medium text-app-fg underline">
              Anúncios
            </Link>{" "}
            para começar.
          </p>
        ) : isLoadingListings ? (
          <p className="text-sm text-app-muted">Carregando imóveis...</p>
        ) : sortedListings.length === 0 ? (
          <p className="text-sm text-app-muted">
            Nenhum imóvel nesta coleção. Adicione anúncios em{" "}
            <Link href="/anuncios" className="underline">
              Anúncios
            </Link>
            .
          </p>
        ) : !selectedListing ? (
          <p className="text-sm text-app-muted">Selecione um imóvel acima.</p>
        ) : (
          <>
            <PropertyDossier
              listing={selectedListing}
              collectionId={activeCollection.id}
              orgId={orgId}
            />
            <DeepAnalysisPanel listing={selectedListing} orgId={orgId} />
          </>
        )}
      </div>
    </div>
  )
}

export function AnaliseClient() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-app-muted">Carregando...</div>}>
      <AnaliseClientInner />
    </Suspense>
  )
}
