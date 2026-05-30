import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AnaliseListingBreadcrumb } from "./listing-selector"
import type { Imovel } from "@/app/anuncios/lib/api"

const mockUseCollections = vi.fn()
const mockPush = vi.fn()
let mockPathname = "/analise"
let mockSearchParams = new URLSearchParams()

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => mockSearchParams,
}))

vi.mock("@/app/anuncios/lib/use-collections", () => ({
  useCollections: () => mockUseCollections(),
}))

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

function mockCollections(listings: Imovel[], isLoadingListings = false) {
  mockUseCollections.mockReturnValue({
    listings,
    isLoadingListings,
    getListingDisplayTitle: (item: Imovel) => item.titulo ?? "",
  })
}

describe("AnaliseListingBreadcrumb", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPathname = "/analise"
    mockSearchParams = new URLSearchParams()
  })

  afterEach(() => {
    cleanup()
  })

  it("shows loading and empty labels", () => {
    mockCollections([], true)
    const rendered = render(<AnaliseListingBreadcrumb />)

    expect(screen.getByRole("button", { name: /selecionar imóvel/i })).toHaveTextContent(
      "Carregando..."
    )

    rendered.unmount()
    mockCollections([])
    render(<AnaliseListingBreadcrumb />)

    expect(screen.getByRole("button", { name: /selecionar imóvel/i })).toHaveTextContent(
      "Nenhum imóvel"
    )
  })

  it("filters listings in the popover", () => {
    mockSearchParams.set("listing", "listing-2")
    mockCollections([
      listing("listing-1", "Casa Alpha", {
        bairro: "Centro",
        endereco: "Rua Alpha",
        imageUrl: "/alpha.jpg",
      }),
      listing("listing-2", "Casa Beta", {
        bairro: "Norte",
        endereco: "Rua Beta",
        imageUrl: "/beta.jpg",
        piscina: true,
        vistaLivre: true,
      }),
    ])

    render(<AnaliseListingBreadcrumb />)
    expect(screen.getByRole("button", { name: /selecionar imóvel/i })).toHaveTextContent(
      "Casa Beta"
    )
    expect(document.querySelectorAll('img[src="/beta.jpg"]').length).toBe(1)
    fireEvent.click(screen.getByRole("button", { name: /selecionar imóvel/i }))

    expect(screen.getByRole("button", { name: /casa alpha/i })).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: /casa beta/i }).length).toBeGreaterThan(0)
    expect(screen.getByText("Rua Beta")).toBeInTheDocument()
    expect(document.querySelectorAll('img[src="/beta.jpg"]').length).toBe(2)

    fireEvent.change(screen.getByPlaceholderText("Buscar..."), {
      target: { value: "Beta" },
    })

    expect(screen.queryByRole("button", { name: /casa alpha/i })).not.toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: /casa beta/i }).length).toBeGreaterThan(0)
  })

  it("updates the listing query param while preserving existing params", () => {
    mockSearchParams = new URLSearchParams("collection=collection-1&view=map")
    mockCollections([
      listing("listing-1", "Casa Alpha", { endereco: "Rua Alpha" }),
      listing("listing-2", "Casa Beta", { endereco: "Rua Beta" }),
    ])

    render(<AnaliseListingBreadcrumb />)
    fireEvent.click(screen.getByRole("button", { name: /selecionar imóvel/i }))
    fireEvent.click(screen.getByRole("button", { name: /casa beta/i }))

    expect(mockPush).toHaveBeenCalledWith(
      "/analise?collection=collection-1&view=map&listing=listing-2",
      { scroll: false }
    )
  })
})
