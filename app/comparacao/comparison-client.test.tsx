"use client"

import { describe, expect, it, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { ComparisonClient } from "./comparison-client"
import type { Collection, Imovel } from "@/app/anuncios/lib/api"

const mockUseCollections = vi.fn()
const mockUpdateListing = vi.fn()
vi.mock("@/app/anuncios/lib/use-collections", () => ({
  useCollections: () => mockUseCollections(),
}))

const mockCollection: Collection = {
  id: "collection-1",
  label: "Coleção teste",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  isDefault: true,
  isPublic: false,
}

const secondCollection: Collection = {
  ...mockCollection,
  id: "collection-2",
  label: "Outra coleção",
}

function makeListing(overrides: Partial<Imovel> = {}): Imovel {
  return {
    id: "listing-1",
    titulo: "Casa teste",
    endereco: "Rua teste",
    bairro: "Itacorubi",
    cidade: "Florianópolis",
    m2Totais: 100,
    m2Privado: 80,
    quartos: 3,
    suites: 1,
    banheiros: 2,
    garagem: 2,
    preco: 700000,
    precoM2: null,
    piscina: false,
    porteiro24h: false,
    academia: false,
    vistaLivre: false,
    piscinaTermica: false,
    tipoImovel: "casa",
    link: "https://example.com",
    imageUrl: null,
    starred: false,
    visited: false,
    strikethrough: false,
    discardedReason: null,
    customLat: null,
    customLng: null,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

const listings: Imovel[] = [
  makeListing({
    id: "listing-1",
    titulo: "Casa Alpha",
    bairro: "Itacorubi",
    m2Totais: 364,
    m2Privado: 354,
    quartos: 4,
    suites: 2,
    banheiros: 4,
    preco: 2600000,
    starred: true,
  }),
  makeListing({
    id: "listing-2",
    titulo: "Casa Beta",
    bairro: "Centro",
    m2Totais: 540,
    m2Privado: 238,
    quartos: 5,
    suites: 2,
    banheiros: 4,
    preco: 3200000,
  }),
  makeListing({
    id: "listing-3",
    titulo: "Casa Gamma",
    bairro: "Córrego Grande",
    m2Totais: 309,
    quartos: 5,
    suites: 2,
    banheiros: 2,
    preco: 2100000,
  }),
  makeListing({
    id: "listing-4",
    titulo: "Apto Delta",
    bairro: "Trindade",
    tipoImovel: "apartamento",
    m2Totais: 193.04,
    m2Privado: 129.3,
    quartos: 4,
    suites: 1,
    banheiros: 3,
    preco: 1550000,
    piscina: true,
    porteiro24h: true,
  }),
  makeListing({
    id: "listing-5",
    titulo: "Casa Epsilon",
    bairro: "Lagoa",
    m2Totais: 220,
    quartos: 2,
    preco: 1000000,
  }),
]

const COMPARISON_SELECTION_STORAGE_KEY = "minha-casa:comparison-selection:collection-1"

function saveStoredComparison(
  slots: Array<string | null>,
  fixedCell: { rowKey: string; slotIndex: number } | null = null
) {
  window.localStorage.setItem(
    COMPARISON_SELECTION_STORAGE_KEY,
    JSON.stringify({ slots, fixedCell })
  )
}

function setup(collectionListings: Imovel[] = listings) {
  mockUpdateListing.mockImplementation(async (listingId, updates) => {
    const listing = collectionListings.find((item) => item.id === listingId)
    if (!listing) {
      throw new Error("Listing not found")
    }
    return { ...listing, ...updates }
  })
  mockUseCollections.mockReturnValue({
    listings: collectionListings,
    activeCollection: mockCollection,
    isLoadingListings: false,
    updateListing: mockUpdateListing,
  })
  render(<ComparisonClient />)
}

describe("ComparisonClient", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
  })

  it("toggles favorite from the slot header star", async () => {
    saveStoredComparison(["listing-1", "listing-2", null, null])
    setup()

    fireEvent.click(
      await screen.findByRole("button", { name: "Remover dos favoritos" })
    )

    await waitFor(() => {
      expect(mockUpdateListing).toHaveBeenCalledWith("listing-1", { starred: false })
    })

    const slot2Header = (await screen.findByRole("button", { name: "Editar imóvel do slot 2" })).closest("th")
    expect(slot2Header).not.toBeNull()
    fireEvent.click(
      within(slot2Header!).getByRole("button", { name: "Adicionar aos favoritos" })
    )

    await waitFor(() => {
      expect(mockUpdateListing).toHaveBeenCalledWith("listing-2", { starred: true })
    })
  })

  it("auto-fills comparison slots with favorites first then other listings", async () => {
    setup()

    expect(await screen.findByText("Preço")).toBeInTheDocument()
    expect(screen.getAllByText("Casa · Itacorubi").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Casa · Centro").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Casa · Córrego Grande").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Apto · Trindade").length).toBeGreaterThan(0)
    expect(screen.queryByText("Casa · Lagoa")).not.toBeInTheDocument()
  })

  it("reloads comparison slots when the shared active collection changes", async () => {
    mockUseCollections.mockReturnValue({
      listings,
      activeCollection: mockCollection,
      isLoadingListings: false,
      updateListing: mockUpdateListing,
    })
    const rendered = render(<ComparisonClient />)

    expect((await screen.findAllByText("Casa · Itacorubi")).length).toBeGreaterThan(0)

    mockUseCollections.mockReturnValue({
      listings: [makeListing({ id: "listing-6", titulo: "Casa Zeta", bairro: "Jurerê" })],
      activeCollection: secondCollection,
      isLoadingListings: false,
      updateListing: mockUpdateListing,
    })
    rendered.rerender(<ComparisonClient />)

    expect((await screen.findAllByText("Casa · Jurerê")).length).toBeGreaterThan(0)
    expect(screen.queryAllByText("Casa · Itacorubi")).toHaveLength(0)
  })

  it("restores saved comparison slot selections locally", async () => {
    saveStoredComparison(["listing-2", "listing-3", null, null])
    setup()

    expect(await screen.findByText("Preço")).toBeInTheDocument()
    expect(screen.getAllByText("Casa · Centro").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Casa · Córrego Grande").length).toBeGreaterThan(0)
  })

  it("fills persisted blank slots with favorites then other listings", async () => {
    saveStoredComparison(["listing-2", null, null, null])
    setup()

    expect(await screen.findByText("Preço")).toBeInTheDocument()
    expect(screen.getAllByText("Casa · Centro").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Casa · Itacorubi").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Casa · Córrego Grande").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Apto · Trindade").length).toBeGreaterThan(0)
  })

  it("auto-fills all slots from collection order when there are no favorites", async () => {
    const listingsWithoutFavorites = listings.map((listing) => ({ ...listing, starred: false }))
    setup(listingsWithoutFavorites)

    expect(await screen.findByText("Preço")).toBeInTheDocument()
    expect(screen.getAllByText("Casa · Itacorubi").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Casa · Centro").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Casa · Córrego Grande").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Apto · Trindade").length).toBeGreaterThan(0)
    expect(screen.queryByText("Casa · Lagoa")).not.toBeInTheDocument()
  })

  it("restores a saved fixed cell locally", async () => {
    saveStoredComparison(["listing-1", "listing-2", null, null], { rowKey: "rooms", slotIndex: 0 })
    setup()

    expect(
      await screen.findByRole("button", { name: /remover célula fixa: quartos de casa · itacorubi/i })
    ).toBeInTheDocument()
  })

  it("toggles a fixed comparison cell on and off", async () => {
    saveStoredComparison(["listing-1", "listing-2", null, null])
    setup()

    expect(await screen.findByText("Preço")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /remover célula fixa:/i })
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /fixar preço de casa · centro/i }))

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /remover célula fixa: preço de casa · centro/i })
      ).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: /remover célula fixa: preço de casa · centro/i }))

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /remover célula fixa:/i })
      ).not.toBeInTheDocument()
    })
  })

  it("changes a slot and keeps duplicate listings out of other slot selectors", async () => {
    setup()

    fireEvent.click(await screen.findByRole("button", { name: "Editar imóvel do slot 4" }))
    const slot4 = await screen.findByRole("combobox", { name: "Selecionar imóvel do slot 4" })
    fireEvent.change(slot4, { target: { value: "listing-5" } })

    expect(slot4).toHaveValue("listing-5")
    expect(screen.getAllByText("Casa · Lagoa").length).toBeGreaterThan(0)

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem(COMPARISON_SELECTION_STORAGE_KEY) || "{}") as { slots?: string[] }
      expect(stored.slots?.[3]).toBe("listing-5")
    })

    fireEvent.click(screen.getByRole("button", { name: "Editar imóvel do slot 1" }))
    const slot1Options = within(screen.getByRole("combobox", { name: "Selecionar imóvel do slot 1" })).getAllByRole("option")
    expect(slot1Options.map((option) => option.textContent)).not.toContain("Casa · Lagoa")
  })

  it("shows recalculated cells with green and red text for numeric rows", async () => {
    saveStoredComparison(["listing-1", "listing-2", "listing-3", null])
    setup()

    fireEvent.click(await screen.findByRole("button", { name: /fixar área total de casa · itacorubi/i }))

    expect(
      (await screen.findAllByText((_, element) => element?.textContent === "R$ 3.857.220")).length
    ).toBeGreaterThan(0)
    expect(screen.getAllByLabelText("valor acima da referência").length).toBeGreaterThan(0)
  })

  it("does not recalculate other listings in the pinned row", async () => {
    saveStoredComparison(["listing-1", "listing-2", null, null])
    setup()

    fireEvent.click(await screen.findByRole("button", { name: /fixar área total de casa · itacorubi/i }))

    expect(
      screen.queryAllByLabelText(/valor (acima|abaixo) da referência/)
        .filter((element) => element.textContent?.includes("/m²"))
    ).toHaveLength(0)
    expect(
      (await screen.findAllByText((_, element) => element?.textContent === "R$ 3.857.220")).length
    ).toBeGreaterThan(0)
  })

  it("uses a fixed price cell to recalculate displayed R$/m²", async () => {
    saveStoredComparison(["listing-1", "listing-2", null, null])
    setup()

    fireEvent.click(await screen.findByRole("button", { name: /fixar preço de casa · itacorubi/i }))

    expect(screen.getAllByLabelText("valor abaixo da referência").length).toBeGreaterThan(0)
  })

  it("uses a fixed room cell to adjust prices by R$50k per room", async () => {
    saveStoredComparison(["listing-1", "listing-2", null, null])
    setup()

    fireEvent.click(await screen.findByRole("button", { name: /fixar quartos de casa · itacorubi/i }))

    expect(
      (await screen.findAllByText((_, element) => element?.textContent === "R$ 3.250.000")).length
    ).toBeGreaterThan(0)

    const quartosRow = screen.getByText("Quartos").closest("tr")
    expect(quartosRow).not.toBeNull()
    const slot2RoomsCell = quartosRow!.querySelectorAll("td")[1]
    expect(slot2RoomsCell).toHaveTextContent("5 (2 suítes)")
    expect(slot2RoomsCell?.querySelector("span")).not.toHaveAttribute("aria-label")
  })

  it("uses a fixed bathroom cell to adjust each listing price by R$50k per bathroom", async () => {
    const listingsWithBathrooms = [
      ...listings.slice(0, 2),
      makeListing({
        id: "listing-bath",
        titulo: "Casa Banho",
        bairro: "Centro",
        banheiros: 3,
        preco: 1_000_000,
      }),
    ]

    saveStoredComparison(["listing-1", "listing-bath", null, null])
    setup(listingsWithBathrooms)

    fireEvent.click(await screen.findByRole("button", { name: /fixar banheiros de casa · itacorubi/i }))

    expect(
      (await screen.findAllByText((_, element) => element?.textContent === "R$ 950.000")).length
    ).toBeGreaterThan(0)
  })

  it("does not recalculate cells in the fixed column", async () => {
    saveStoredComparison(["listing-1", "listing-2", null, null])
    setup()

    fireEvent.click(await screen.findByRole("button", { name: /fixar área total de casa · itacorubi/i }))

    expect(screen.getAllByText((_, element) => element?.textContent === "R$ 2.600.000").length).toBeGreaterThan(0)
    expect(screen.getAllByText((_, element) => element?.textContent === "R$ 3.857.220").length).toBeGreaterThan(0)
  })

  it("combines area and price per m² in the area rows", async () => {
    saveStoredComparison(["listing-1", "listing-2", "listing-3", "listing-4"])
    setup()

    const areaCellText = (text: string) => (_: string, element: Element | null) =>
      (element?.textContent ?? "").replace(/\s/g, " ").includes(text.replace(/\s/g, " "))

    expect(
      (await screen.findAllByText(areaCellText("364 m² (R$ 7.143/m²)"))).length
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByText(areaCellText("354 m² (R$ 7.345/m²)")).length
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByText(areaCellText("193 m² (R$ 8.029/m²)")).length
    ).toBeGreaterThan(0)
  })

  it("shows suites inside the rooms row", async () => {
    setup()

    expect(await screen.findByText("4 (2 suítes)")).toBeInTheDocument()
    expect(screen.queryByText("Suítes")).not.toBeInTheDocument()
  })

})
