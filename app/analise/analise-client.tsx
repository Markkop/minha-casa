"use client"

import { Suspense, useMemo } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useCollections } from "@/app/anuncios/lib/use-collections"
import {
  WORKSPACE_CONTENT_CLASS,
  WORKSPACE_STACK_CLASS,
  WorkspaceLoadingState,
} from "@/app/components/workspace-ui"
import { useAdminFlag } from "@/lib/admin-feature-flags-provider"
import { useWorkspaceProfile } from "@/lib/workspace/use-workspace-profile"
import { AnaliseQuerySync } from "./components/analise-query-sync"
import { DeepAnalysisPanel } from "./components/deep-analysis-panel"
import { PropertyDossier } from "./components/property-dossier"

function AnaliseClientInner() {
  const { orgId } = useWorkspaceProfile()
  const showDeepAnalysis = useAdminFlag("deepAnalysis")
  const searchParams = useSearchParams()
  const selectedListingId = searchParams.get("listing")
  const { listings, activeCollection, isLoadingListings } = useCollections()

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

  return (
    <div className="min-h-[calc(100vh-var(--nav-height,2.75rem))] bg-app-bg text-app-fg">
      <AnaliseQuerySync />

      <div className={`${WORKSPACE_CONTENT_CLASS} ${WORKSPACE_STACK_CLASS}`}>
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
            {showDeepAnalysis && (
              <DeepAnalysisPanel listing={selectedListing} orgId={orgId} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

export function AnaliseClient() {
  return (
    <Suspense fallback={<WorkspaceLoadingState />}>
      <AnaliseClientInner />
    </Suspense>
  )
}
