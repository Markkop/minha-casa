"use client"

import { useState } from "react"
import { DemoListingsTable } from "../anuncios/components/demo-listings-table"
import { DemoParserModal } from "../anuncios/components/demo-parser-modal"
import type { Imovel } from "../anuncios/lib/api"
import { cn } from "@/lib/utils"

const INITIAL_DEMO_LISTINGS: Imovel[] = [
  {
    id: "demo-1",
    titulo: "Casa Alto Padrão - Jurerê Internacional",
    endereco: "Rua das Palmeiras, 123 - Jurerê Internacional, Florianópolis",
    m2Totais: 450,
    m2Privado: 320,
    quartos: 4,
    suites: 2,
    banheiros: 4,
    garagem: 3,
    preco: 2850000,
    precoM2: 2850000 / 320,
    piscina: true,
    porteiro24h: null,
    academia: null,
    vistaLivre: null,
    piscinaTermica: null,
    link: null,
    tipoImovel: "casa",
    starred: true,
    visited: false,
    strikethrough: false,
    createdAt: new Date().toISOString(),
    addedAt: "2026-01-20",
  },
  {
    id: "demo-2",
    titulo: "Apartamento Vista Mar - Beira Mar Norte",
    endereco: "Av. Jornalista Rubens de Arruda Ramos, 1000 - Centro, Florianópolis",
    m2Totais: 210,
    m2Privado: 180,
    quartos: 3,
    suites: 3,
    banheiros: 4,
    garagem: 2,
    preco: 3200000,
    precoM2: 3200000 / 180,
    piscina: false,
    porteiro24h: null,
    academia: null,
    vistaLivre: null,
    piscinaTermica: null,
    link: null,
    tipoImovel: "apartamento",
    starred: false,
    visited: true,
    strikethrough: false,
    createdAt: new Date().toISOString(),
    addedAt: "2026-01-22",
  },
  {
    id: "demo-3",
    titulo: "Sobrado Moderno - Novo Campeche",
    endereco: "Rua dos Surfistas, 50 - Campeche, Florianópolis",
    m2Totais: 180,
    m2Privado: 150,
    quartos: 3,
    suites: 1,
    banheiros: 2,
    garagem: 1,
    preco: 1250000,
    precoM2: 1250000 / 150,
    piscina: true,
    porteiro24h: null,
    academia: null,
    vistaLivre: null,
    piscinaTermica: null,
    link: null,
    tipoImovel: "casa",
    starred: false,
    visited: false,
    strikethrough: true,
    discardedReason: "Preço acima do mercado para a região",
    createdAt: new Date().toISOString(),
    addedAt: "2026-01-25",
  },
]

export function DemoListingsSection() {
  const [listings, setListings] = useState<Imovel[]>(INITIAL_DEMO_LISTINGS)
  const [isParserOpen, setIsParserOpen] = useState(false)

  const handleUpdateListing = (id: string, updates: Partial<Imovel>) => {
    setListings((prev) =>
      prev.map((listing) =>
        listing.id === id ? { ...listing, ...updates } : listing
      )
    )
  }

  const handleDeleteListing = (id: string) => {
    setListings((prev) => prev.filter((listing) => listing.id !== id))
  }

  const handleListingAdded = (newListing: Imovel) => {
    setListings((prev) => [newListing, ...prev])
  }

  return (
    <section className="mt-16 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col justify-between gap-4 border-b border-app-border pb-4 md:flex-row md:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-app-fg">
            <span>🏘️</span>
            <span>Gerenciador de Anuncios</span>
          </h2>
          <p className="text-sm text-app-muted">
            Cole anuncios de imoveis e deixe a IA extrair automaticamente todos os dados relevantes.
          </p>
        </div>
        
        <button
          onClick={() => setIsParserOpen(true)}
          className={cn(
            "px-6 py-3 rounded-xl font-bold transition-all",
            "bg-app-action text-app-action-foreground hover:bg-app-action-hover active:scale-95",
            "flex items-center justify-center gap-2"
          )}
        >
          <span>✨</span>
          <span>Adicionar com IA</span>
        </button>
      </div>

      <DemoListingsTable
        listings={listings}
        onUpdateListing={handleUpdateListing}
        onDeleteListing={handleDeleteListing}
      />

      <DemoParserModal
        isOpen={isParserOpen}
        onClose={() => setIsParserOpen(false)}
        onListingAdded={handleListingAdded}
      />
    </section>
  )
}
