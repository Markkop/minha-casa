"use client"

import { useState, useEffect } from "react"
import { ListingsTable } from "./listings-table"
import { ListingsMap } from "./listings-map"
import { SettingsModal } from "./settings-modal"
import { ParserModal } from "./parser-modal"
import { DataManagement } from "./data-management"
import { CollectionSelector } from "./collection-selector"
import { CollectionModal } from "./collection-modal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ensureCollectionsData,
  getListingsForCollection,
  getActiveCollection,
  getCollection,
  setActiveCollection,
  setDefaultCollection,
  hasApiKey as checkHasApiKey,
  decompressCollectionData,
  importToCollection,
  importCollections,
  type Imovel,
  type Collection,
} from "../lib/storage"
import { cn } from "@/lib/utils"

export function AnunciosClient() {
  const [listings, setListings] = useState<Imovel[]>([])
  const [activeCollection, setActiveCollection] = useState<Collection | null>(null)
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showParser, setShowParser] = useState(false)
  const [showCollectionModal, setShowCollectionModal] = useState(false)
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [collectionRefreshTrigger, setCollectionRefreshTrigger] = useState(0)
  const [showShareConfirm, setShowShareConfirm] = useState(false)
  const [shareData, setShareData] = useState<{ collection: Collection; listings: Imovel[] } | null>(null)

  // Initialize collections system and load data
  useEffect(() => {
    // Ensure collections data is initialized (migrates legacy data if needed)
    ensureCollectionsData()
    
    // Load active collection and its listings
    const collection = getActiveCollection()
    setActiveCollection(collection)
    setListings(collection ? getListingsForCollection(collection.id) : [])
    
    setApiKeyConfigured(checkHasApiKey())
    setIsLoaded(true)

    // Check for share parameters in URL
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      
      // Handle URL-based share (compressed in URL)
      const shareParam = params.get("share")
      if (shareParam) {
        try {
          const decompressed = decompressCollectionData(shareParam)
          setShareData(decompressed)
          setShowShareConfirm(true)
          
          // Clean URL without reloading
          const newUrl = window.location.pathname
          window.history.replaceState({}, "", newUrl)
        } catch (error) {
          console.error("Failed to process share link:", error)
        }
        return // Don't process dbshare if share is present
      }
      
      // Handle database-based share (token in URL)
      const dbShareParam = params.get("dbshare")
      if (dbShareParam) {
        // Fetch from API
        fetch(`/api/share/${dbShareParam}`)
          .then((response) => {
            if (!response.ok) {
              throw new Error("Share not found")
            }
            return response.json()
          })
          .then((data) => {
            if (data.collection && data.listings) {
              setShareData({
                collection: data.collection,
                listings: data.listings,
              })
              setShowShareConfirm(true)
            }
          })
          .catch((error) => {
            console.error("Failed to fetch database share:", error)
          })
          .finally(() => {
            // Clean URL without reloading
            const newUrl = window.location.pathname
            window.history.replaceState({}, "", newUrl)
          })
      }
    }
  }, [])

  const loadListings = () => {
    const collection = getActiveCollection()
    setActiveCollection(collection)
    setListings(collection ? getListingsForCollection(collection.id) : [])
    setCollectionRefreshTrigger((prev) => prev + 1)
  }

  const handleListingsChange = (newListings: Imovel[]) => {
    setListings(newListings)
    setCollectionRefreshTrigger((prev) => prev + 1)
  }

  const handleApiKeyChange = (hasKey: boolean) => {
    setApiKeyConfigured(hasKey)
  }

  const handleCollectionChange = (collection: Collection | null) => {
    setActiveCollection(collection)
    if (collection) {
      setListings(getListingsForCollection(collection.id))
    } else {
      setListings([])
    }
  }

  const handleSwitchToCollection = (collectionId: string) => {
    const collection = getCollection(collectionId)
    if (collection) {
      handleCollectionChange(collection)
      setCollectionRefreshTrigger((prev) => prev + 1)
    }
  }

  const handleCreateCollection = () => {
    setEditingCollection(null)
    setShowCollectionModal(true)
  }

  const handleEditCollection = (collection: Collection) => {
    setEditingCollection(collection)
    setShowCollectionModal(true)
  }

  const handleDeleteCollection = (collection: Collection) => {
    // The modal will handle the deletion
    setEditingCollection(collection)
    setShowCollectionModal(true)
  }

  const handleSetDefaultCollection = (collection: Collection) => {
    const updatedCollection = setDefaultCollection(collection.id)
    if (updatedCollection) {
      // Refresh collections and listings
      setCollectionRefreshTrigger((prev) => prev + 1)
      // Update active collection state if it's the one we just set as default
      if (activeCollection?.id === collection.id) {
        handleCollectionChange(updatedCollection)
      }
    }
  }

  const handleCollectionModalClose = () => {
    setShowCollectionModal(false)
    setEditingCollection(null)
    // Reload collections and listings
    // Increment refresh trigger to update CollectionSelector
    // This will trigger CollectionSelector's useEffect which calls handleCollectionChange
    setCollectionRefreshTrigger((prev) => prev + 1)
    // Also directly update local state to ensure it's synchronized
    const collection = getActiveCollection()
    handleCollectionChange(collection)
  }

  const handleShareImport = () => {
    if (!shareData) return

    try {
      // Import the shared collection data (CollectionExport format)
      const json = JSON.stringify(shareData)
      const { data, lastImportedCollectionId } = importCollections(json)
      
      // Switch to the imported collection if one was imported
      if (lastImportedCollectionId) {
        handleSwitchToCollection(lastImportedCollectionId)
      } else {
        // Fallback: reload listings from active collection
        loadListings()
      }

      setShowShareConfirm(false)
      setShareData(null)
    } catch (error) {
      console.error("Failed to import shared data:", error)
      setShowShareConfirm(false)
      setShareData(null)
    }
  }

  const handleShareCancel = () => {
    setShowShareConfirm(false)
    setShareData(null)
  }

  // Show loading state until client-side data is loaded
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-ashGray">Carregando...</p>
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
                onSetDefault={handleSetDefaultCollection}
                refreshTrigger={collectionRefreshTrigger}
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
        onApiKeyChange={handleApiKeyChange}
      />

      {/* Collection Modal */}
      <CollectionModal
        isOpen={showCollectionModal}
        onClose={handleCollectionModalClose}
        collection={editingCollection}
        onCollectionChange={loadListings}
      />

      {/* Parser Modal */}
      <ParserModal
        isOpen={showParser}
        onClose={() => setShowParser(false)}
        onListingAdded={loadListings}
        hasApiKey={apiKeyConfigured}
        onOpenSettings={() => {
          setShowParser(false)
          setShowSettings(true)
        }}
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
            onImportSuccess={() => setCollectionRefreshTrigger((prev) => prev + 1)}
            onSwitchToCollection={handleSwitchToCollection}
          />
        </div>

        {/* Main Content - Full Width Table */}
        <ListingsTable
          listings={listings}
          onListingsChange={loadListings}
          refreshTrigger={collectionRefreshTrigger}
        />

        {/* Map View */}
        <ListingsMap listings={listings} onListingsChange={handleListingsChange} />
      </main>
    </div>
  )
}

