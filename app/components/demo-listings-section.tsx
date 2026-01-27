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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brightGrey pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>🏘️</span>
            <span>Experimente o Gerenciador</span>
          </h2>
          <p className="text-ashGray text-sm">
            Teste as funcionalidades de organização e o parser com IA agora mesmo.
          </p>
        </div>
        
        <button
          onClick={() => setIsParserOpen(true)}
          className={cn(
            "px-6 py-3 rounded-xl font-bold transition-all",
            "bg-primary text-black hover:scale-105 active:scale-95",
            "shadow-[0_0_20px_rgba(197,255,1,0.2)] hover:shadow-[0_0_30px_rgba(197,255,1,0.4)]",
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

      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center space-y-4">
        <h3 className="text-white font-bold">Gostou da experiência?</h3>
        <p className="text-ashGray text-sm max-w-lg mx-auto">
          Crie sua conta gratuitamente para salvar suas coleções de imóveis, sincronizar entre dispositivos e gerenciar seus contatos com facilidade.
        </p>
        <div className="flex flex-wrap justify-center gap-4 pt-2">
          <a
            href="/anuncios"
            className="px-8 py-3 rounded-xl bg-white text-black font-bold hover:bg-ashGray transition-colors"
          >
            Começar Agora
          </a>
        </div>
      </div>
    </section>
  )
}
