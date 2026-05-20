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

function AnunciosClientInner() {
  const {
    collections,
    listings,
    isLoading,
    isLoadingListings,
    error,
    setActiveCollection,
    createCollectionInProfile,
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
        const targetOrgId =
          orgContext.type === "organization"
            ? (orgContext.organizationId ?? null)
            : null
        const created = await createCollectionInProfile(name, targetOrgId, true)
        setActiveCollection(created)
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
    createCollectionInProfile,
    orgContext,
    setActiveCollection,
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
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-ashGray">Carregando...</p>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-2">Erro ao carregar dados</p>
          <p className="text-sm text-muted-foreground">{error}</p>
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
      <div className="min-h-screen bg-black text-white">
        {/* Header */}
        <header className="border-b border-brightGrey bg-raisinBlack">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl font-bold text-primary mb-2">
                  🏘️ Anúncios de Imóveis
                </h1>
                <p className="text-ashGray">
                  Gerencie anúncios e extraia dados facilmente de fontes externas.
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Empty State */}
        <main className="max-w-7xl mx-auto px-4 py-12">
          <Card className="bg-raisinBlack border-brightGrey max-w-lg mx-auto">
            <CardContent className="py-12 text-center space-y-6">
              <div className="text-6xl">📁</div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-white">
                  {isOrgContext
                    ? `Nenhuma coleção na organização "${contextName}"`
                    : "Nenhuma coleção pessoal"}
                </h2>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
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
                  "bg-primary text-primary-foreground",
                  "hover:bg-primary/90",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "flex items-center gap-2 mx-auto"
                )}
              >
                {isCreatingFirstCollection ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Criando...</span>
                  </>
                ) : (
                  <>
                    <span>+</span>
                    <span>Começar</span>
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
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-brightGrey bg-raisinBlack">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-primary mb-2">
                🏘️ Anúncios de Imóveis
              </h1>
              <p className="text-ashGray">
                Cole anúncios de imóveis e deixe a IA extrair os dados automaticamente.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 md:flex-nowrap">
              <CollectionSelector
                onCollectionChange={handleCollectionChange}
                onCreateCollection={handleCreateCollection}
                onEditCollection={handleEditCollection}
                onDeleteCollection={handleDeleteCollection}
                refreshTrigger={refreshTrigger}
              />
              <button
                onClick={() => setShowSettings(true)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  "bg-eerieBlack border border-brightGrey",
                  "hover:border-primary hover:text-primary",
                  "flex items-center gap-2 whitespace-nowrap"
                )}
              >
                <span>⚙️</span>
                <span className="hidden sm:inline">Configurações</span>
              </button>
            </div>
          </div>
        </div>
      </header>

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
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={handleShareCancel}
          />
          <Card className="relative z-10 w-full max-w-md mx-4 bg-raisinBlack border-brightGrey">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <span>🔗</span>
                <span>Importar Coleção Compartilhada</span>
              </CardTitle>
              <button
                onClick={handleShareCancel}
                className="text-muted-foreground hover:text-white transition-colors"
              >
                ✕
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-ashGray">
                  Você recebeu um link compartilhado com dados de uma coleção:
                </p>
                <div className="p-3 rounded-lg bg-eerieBlack border border-brightGrey">
                  <p className="text-sm font-medium text-white">
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
                    "bg-eerieBlack border border-brightGrey",
                    "hover:border-white"
                  )}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleShareImport}
                  className={cn(
                    "flex-1 py-2.5 px-4 rounded-lg font-medium transition-all",
                    "bg-primary text-primary-foreground",
                    "hover:bg-primary/90",
                    "flex items-center justify-center gap-2"
                  )}
                >
                  <span>📥</span>
                  Importar
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Data Management Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <DataManagement
            onDataChange={handleListingsChange}
            listingsCount={listings.length}
            onOpenParser={() => setShowParser(true)}
            onImportSuccess={triggerRefresh}
            onSwitchToCollection={handleSwitchToCollection}
          />
        </div>

        {/* Main Content - Full Width Table */}
        {isLoadingListings ? (
          <Card className="bg-raisinBlack border-brightGrey">
            <CardContent className="py-12 text-center">
              <p className="text-ashGray">Carregando imóveis...</p>
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
