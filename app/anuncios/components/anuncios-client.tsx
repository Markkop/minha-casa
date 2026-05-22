"use client"

import { useState, useCallback, useEffect } from "react"
import { ListingsTable } from "./listings-table"
import { ListingsMap } from "./listings-map"
import { SettingsModal } from "./settings-modal"
import { ParserModal } from "./parser-modal"
import { DataManagement } from "./data-management"
import { CollectionSelector } from "./collection-selector"
import { CollectionModal } from "./collection-modal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CollectionsProvider, useCollections } from "../lib/use-collections"
import { getDefaultFirstCollectionName } from "../lib/default-first-collection-name"
import { cn } from "@/lib/utils"
import type { Collection, Imovel } from "../lib/api"
import { syncSubscriptionCookie } from "@/lib/sync-subscription-cookie"
import {
  PageToolbar,
  PageToolbarEnd,
  PageToolbarIconButton,
  PageToolbarStart,
} from "@/app/components/page-toolbar"
import { Download, FolderOpen, Link2, Loader2, Plus, Settings } from "lucide-react"
import { ModalCloseButton } from "./modal-chrome"

function AnunciosClientInner() {
  const {
    collections,
    listings,
    isLoading,
    isLoadingListings,
    error,
    setActiveCollection,
    createCollection,
    loadListings,
    refreshTrigger,
    triggerRefresh,
    orgContext,
  } = useCollections()

  const [showSettings, setShowSettings] = useState(false)
  const [showParser, setShowParser] = useState(false)
  const [showCollectionModal, setShowCollectionModal] = useState(false)
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null)
  const [showShareConfirm, setShowShareConfirm] = useState(false)
  const [shareData, setShareData] = useState<{ collection: Collection; listings: Imovel[] } | null>(null)
  const [isCreatingFirstCollection, setIsCreatingFirstCollection] = useState(false)
  const [createCollectionError, setCreateCollectionError] = useState<string | null>(null)

  useEffect(() => {
    void syncSubscriptionCookie()
  }, [])

  const handleListingsChange = useCallback(() => {
    // Trigger a refresh of the listings
    loadListings()
    triggerRefresh()
  }, [loadListings, triggerRefresh])

  const handleCollectionChange = useCallback(
    (collection: Collection | null) => {
      setActiveCollection(collection)
    },
    [setActiveCollection]
  )

  const handleSwitchToCollection = useCallback(
    (collectionId: string) => {
      const collection = collections.find((c) => c.id === collectionId)
      if (collection) {
        handleCollectionChange(collection)
        triggerRefresh()
      }
    },
    [collections, handleCollectionChange, triggerRefresh]
  )

  const handleCreateCollection = useCallback(async () => {
    if (collections.length === 0) {
      setIsCreatingFirstCollection(true)
      setCreateCollectionError(null)
      try {
        const name = getDefaultFirstCollectionName()
        await createCollection(name, true)
        triggerRefresh()
      } catch (err) {
        setCreateCollectionError(
          err instanceof Error ? err.message : "Erro ao criar coleção"
        )
      } finally {
        setIsCreatingFirstCollection(false)
      }
      return
    }

    setEditingCollection(null)
    setShowCollectionModal(true)
  }, [
    collections.length,
    createCollection,
    triggerRefresh,
  ])

  const handleEditCollection = useCallback((collection: Collection) => {
    setEditingCollection(collection)
    setShowCollectionModal(true)
  }, [])

  const handleDeleteCollection = useCallback((collection: Collection) => {
    setEditingCollection(collection)
    setShowCollectionModal(true)
  }, [])

  const handleCollectionModalClose = useCallback(() => {
    setShowCollectionModal(false)
    setEditingCollection(null)
    triggerRefresh()
  }, [triggerRefresh])

  const handleShareImport = useCallback(() => {
    if (!shareData) return

    // For now, just close the modal - import functionality will be handled separately
    // The legacy URL-based sharing can be deprecated in favor of server-side sharing
    setShowShareConfirm(false)
    setShareData(null)
  }, [shareData])

  const handleShareCancel = useCallback(() => {
    setShowShareConfirm(false)
    setShareData(null)
  }, [])

  // Show loading state until data is loaded
  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-104px)] items-center justify-center bg-app-bg text-app-fg">
        <p className="text-app-muted">Carregando...</p>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="flex min-h-[calc(100vh-104px)] items-center justify-center bg-app-bg text-app-fg">
        <div className="text-center">
          <p className="text-destructive mb-2">Erro ao carregar dados</p>
          <p className="text-sm text-app-muted">{error}</p>
        </div>
      </div>
    )
  }

  // Show empty state when no collections exist
  if (collections.length === 0) {
    const isOrgContext = orgContext.type === "organization"
    const contextName = isOrgContext ? orgContext.organizationName : "pessoal"
    const defaultCollectionName = getDefaultFirstCollectionName()

    return (
      <div className="min-h-[calc(100vh-104px)] bg-app-bg text-app-fg">
        {/* Header */}

        {/* Empty State */}
        <main className="max-w-7xl mx-auto px-4 py-12">
          <Card className="mx-auto max-w-lg border-app-border bg-app-surface">
            <CardContent className="py-12 text-center space-y-6">
              <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground" />
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-app-fg">
                  {isOrgContext
                    ? `Nenhuma coleção na organização "${contextName}"`
                    : "Nenhuma coleção pessoal"}
                </h2>
                <p className="mx-auto max-w-sm text-sm text-app-muted">
                  {isOrgContext
                    ? `Comece agora — criamos automaticamente a coleção "${defaultCollectionName}" nesta organização.`
                    : `Comece agora — criamos automaticamente a coleção "${defaultCollectionName}" para você salvar imóveis.`}
                </p>
              </div>
              {createCollectionError && (
                <p className="text-sm text-destructive">{createCollectionError}</p>
              )}
              <button
                onClick={() => void handleCreateCollection()}
                disabled={isCreatingFirstCollection}
                className={cn(
                  "px-6 py-3 rounded-lg text-sm font-medium transition-all",
                  "bg-app-action text-app-action-foreground",
                  "hover:bg-app-action-hover",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "flex items-center gap-2 mx-auto"
                )}
              >
                {isCreatingFirstCollection ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Criando...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>Criar Primeira Coleção</span>
                  </>
                )}
              </button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-104px)] bg-app-bg text-app-fg">
      <PageToolbar>
        <PageToolbarStart>
          <DataManagement
            onDataChange={handleListingsChange}
            listingsCount={listings.length}
            onOpenParser={() => setShowParser(true)}
            onImportSuccess={triggerRefresh}
            onSwitchToCollection={handleSwitchToCollection}
          />
        </PageToolbarStart>
        <PageToolbarEnd>
          <CollectionSelector
            onCollectionChange={handleCollectionChange}
            onCreateCollection={handleCreateCollection}
            onEditCollection={handleEditCollection}
            onDeleteCollection={handleDeleteCollection}
            refreshTrigger={refreshTrigger}
          />
          <PageToolbarIconButton
            onClick={() => setShowSettings(true)}
            title="Configurações"
          >
            <Settings />
          </PageToolbarIconButton>
        </PageToolbarEnd>
      </PageToolbar>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Collection Modal */}
      <CollectionModal
        isOpen={showCollectionModal}
        onClose={handleCollectionModalClose}
        collection={editingCollection}
        onCollectionChange={handleListingsChange}
      />

      {/* Parser Modal */}
      <ParserModal
        isOpen={showParser}
        onClose={() => setShowParser(false)}
        onListingAdded={handleListingsChange}
      />

      {/* Share Import Confirmation Modal */}
      {showShareConfirm && shareData && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-app-fg/40 backdrop-blur-sm"
            onClick={handleShareCancel}
          />
          <Card className="relative z-10 w-full max-w-md mx-4 border-app-border bg-app-surface">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Link2 className="h-5 w-5 text-app-accent" />
                <span>Importar Coleção Compartilhada</span>
              </CardTitle>
              <ModalCloseButton onClick={handleShareCancel} />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-app-muted">
                  Você recebeu um link compartilhado com dados de uma coleção:
                </p>
                <div className="rounded-lg border border-app-border bg-app-bg p-3">
                  <p className="text-sm font-medium text-app-fg">
                    {shareData.collection.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {shareData.listings.length} imóvel{shareData.listings.length !== 1 ? "eis" : ""}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Deseja importar esta coleção? Os dados serão adicionados à sua coleção atual.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleShareCancel}
                  className={cn(
                    "flex-1 py-2.5 px-4 rounded-lg font-medium transition-all",
                    "border border-app-border bg-app-surface text-app-fg",
                    "hover:border-app-border-strong hover:bg-app-bg hover:text-app-fg"
                  )}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleShareImport}
                  className={cn(
                    "flex-1 py-2.5 px-4 rounded-lg font-medium transition-all",
                    "bg-app-action text-app-action-foreground",
                    "hover:bg-app-action-hover",
                    "flex items-center justify-center gap-2"
                  )}
                >
                  <Download className="h-4 w-4" />
                  Importar
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <main className="max-w-7xl mx-auto space-y-4 px-4 py-4">
        {/* Main Content - Full Width Table */}
        {isLoadingListings ? (
          <Card className="border-app-border bg-app-surface">
            <CardContent className="py-12 text-center">
              <p className="text-app-muted">Carregando imóveis...</p>
            </CardContent>
          </Card>
        ) : (
          <ListingsTable
            listings={listings}
            onListingsChange={handleListingsChange}
            refreshTrigger={refreshTrigger}
          />
        )}

        {/* Map View */}
        <ListingsMap listings={listings} onListingsChange={handleListingsChange} />
      </main>
    </div>
  )
}

export function AnunciosClient() {
  return (
    <CollectionsProvider>
      <AnunciosClientInner />
    </CollectionsProvider>
  )
}
