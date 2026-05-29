"use client"

import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AnunciosClient } from "./anuncios-client"
import type { Collection, Imovel } from "../lib/api"

const mockUseCollections = vi.fn()

vi.mock("../lib/use-collections", () => ({
  useCollections: () => mockUseCollections(),
}))

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@/lib/sync-subscription-cookie", () => ({
  syncSubscriptionCookie: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("./data-management", () => ({
  ImportExportActions: () => <div data-testid="import-export-actions" />,
}))

vi.mock("./listings-map", () => ({
  ListingsMap: ({ listings }: { listings: Imovel[] }) => (
    <div data-testid="listings-map">{listings.length}</div>
  ),
}))

vi.mock("./listings-table", () => ({
  ListingsTable: ({ listings }: { listings: Imovel[] }) => (
    <div data-testid="listings-table">
      {listings.map((listing) => (
        <span key={listing.id}>{listing.titulo}</span>
      ))}
    </div>
  ),
}))

const collection: Collection = {
  id: "collection-1",
  label: "Coleção",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  isDefault: true,
  isPublic: false,
}

function listing(id: string, titulo: string): Imovel {
  return {
    id,
    titulo,
    endereco: "Rua teste",
    bairro: null,
    cidade: null,
    m2Totais: 100,
    m2Privado: 80,
    quartos: 3,
    suites: 1,
    banheiros: 2,
    garagem: 1,
    preco: 800000,
    precoM2: null,
    piscina: null,
    porteiro24h: null,
    academia: null,
    vistaLivre: null,
    piscinaTermica: null,
    tipoImovel: "casa",
    link: null,
    imageUrl: null,
    imageUrls: [],
    imageStorageKeys: null,
    imageIngestionStatus: null,
    imageIngestionError: null,
    starred: false,
    visited: false,
    strikethrough: false,
    createdAt: "2026-01-01T00:00:00Z",
  }
}

function mockCollections(listings: Imovel[]) {
  mockUseCollections.mockReturnValue({
    collections: [collection],
    listings,
    isLoading: false,
    isLoadingListings: false,
    error: null,
    setActiveCollection: vi.fn(),
    createCollection: vi.fn(),
    loadListings: vi.fn(),
    refreshTrigger: 0,
    triggerRefresh: vi.fn(),
    orgContext: { type: "personal" },
  })
}

describe("AnunciosClient", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders listings from the shared active collection state", () => {
    mockCollections([listing("listing-1", "Casa Alpha")])
    const rendered = render(<AnunciosClient />)

    expect(screen.getByText("Casa Alpha")).toBeInTheDocument()

    mockCollections([listing("listing-2", "Casa Beta")])
    rendered.rerender(<AnunciosClient />)

    expect(screen.getByText("Casa Beta")).toBeInTheDocument()
    expect(screen.queryByText("Casa Alpha")).not.toBeInTheDocument()
  })
})
