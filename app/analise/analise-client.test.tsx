"use client"

import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AnaliseClient } from "./analise-client"
import type { Collection, Imovel } from "@/app/anuncios/lib/api"

const mockUseCollections = vi.fn()
let mockSearchParams = new URLSearchParams()

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}))

vi.mock("@/app/anuncios/lib/use-collections", () => ({
  useCollections: () => mockUseCollections(),
}))

vi.mock("@/lib/workspace/use-workspace-profile", () => ({
  useWorkspaceProfile: () => ({ orgId: null }),
}))

vi.mock("./components/analise-query-sync", () => ({
  AnaliseQuerySync: () => null,
}))

vi.mock("./components/property-dossier", () => ({
  PropertyDossier: ({ listing }: { listing: Imovel }) => (
    <div data-testid="property-dossier">{listing.titulo}</div>
  ),
}))

vi.mock("./components/deep-analysis-panel", () => ({
  DeepAnalysisPanel: ({ listing }: { listing: Imovel }) => (
    <div data-testid="deep-analysis-panel">{listing.id}</div>
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

function listing(
  id: string,
  titulo: string,
  overrides: Partial<Imovel> = {}
): Imovel {
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
    ...overrides,
  }
}

function mockCollections(listings: Imovel[]) {
  mockUseCollections.mockReturnValue({
    listings,
    activeCollection: collection,
    isLoadingListings: false,
    collections: [collection],
    setActiveCollection: vi.fn(),
  })
}

describe("AnaliseClient", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchParams = new URLSearchParams()
  })

  it("reselects from the shared active collection when listings change", async () => {
    mockCollections([listing("listing-1", "Casa Alpha")])
    const rendered = render(<AnaliseClient />)

    expect(await screen.findByTestId("property-dossier")).toHaveTextContent(
      "Casa Alpha"
    )

    mockCollections([listing("listing-2", "Casa Beta")])
    rendered.rerender(<AnaliseClient />)

    await waitFor(() => {
      expect(screen.getByTestId("property-dossier")).toHaveTextContent(
        "Casa Beta"
      )
    })
  })

  it("renders the selected listing from the listing query param", async () => {
    mockSearchParams.set("listing", "listing-2")
    mockCollections([
      listing("listing-1", "Casa Alpha"),
      listing("listing-2", "Casa Beta"),
    ])

    render(<AnaliseClient />)

    expect(await screen.findByTestId("property-dossier")).toHaveTextContent(
      "Casa Beta"
    )
    expect(screen.queryByTestId("listing-selector")).not.toBeInTheDocument()
  })

  it("falls back to the first non-struck listing when the query param is invalid", async () => {
    mockSearchParams.set("listing", "missing")
    mockCollections([
      listing("listing-0", "Casa Riscada", { strikethrough: true }),
      listing("listing-2", "Casa Beta"),
      listing("listing-1", "Casa Alpha"),
    ])

    render(<AnaliseClient />)

    expect(await screen.findByTestId("property-dossier")).toHaveTextContent(
      "Casa Alpha"
    )
  })
})
