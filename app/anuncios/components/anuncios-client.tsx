"use client"

import { useState, useEffect } from "react"
import { ListingsTable } from "./listings-table"
import { ListingsMap } from "./listings-map"
import { SettingsModal } from "./settings-modal"
import { ParserModal } from "./parser-modal"
import { DataManagement } from "./data-management"
import { getListings, hasApiKey as checkHasApiKey, type Imovel } from "../lib/storage"
import { cn } from "@/lib/utils"

export function AnunciosClient() {
  const [listings, setListings] = useState<Imovel[]>([])
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showParser, setShowParser] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load data from localStorage on mount
  useEffect(() => {
    setListings(getListings())
    setApiKeyConfigured(checkHasApiKey())
    setIsLoaded(true)
  }, [])

  const handleListingsChange = (newListings: Imovel[]) => {
    setListings(newListings)
  }

  const handleApiKeyChange = (hasKey: boolean) => {
    setApiKeyConfigured(hasKey)
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
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary mb-2">
                🏘️ Anúncios de Imóveis
              </h1>
              <p className="text-ashGray">
                Cole anúncios de imóveis e deixe a IA extrair os dados automaticamente.
              </p>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                "bg-eerieBlack border border-brightGrey",
                "hover:border-primary hover:text-primary",
                "flex items-center gap-2"
              )}
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">Configurações</span>
            </button>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onApiKeyChange={handleApiKeyChange}
      />

      {/* Parser Modal */}
      <ParserModal
        isOpen={showParser}
        onClose={() => setShowParser(false)}
        onListingAdded={handleListingsChange}
        hasApiKey={apiKeyConfigured}
        onOpenSettings={() => {
          setShowParser(false)
          setShowSettings(true)
        }}
      />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Data Management Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <DataManagement
            onDataChange={handleListingsChange}
            listingsCount={listings.length}
            onOpenParser={() => setShowParser(true)}
          />
        </div>

        {/* Main Content - Full Width Table */}
        <ListingsTable
          listings={listings}
          onListingsChange={handleListingsChange}
        />

        {/* Map View */}
        <ListingsMap listings={listings} />
      </main>
    </div>
  )
}

