import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { ShareClient } from "./share-client"

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock listing data
const mockListing = {
  id: "listing-1",
  data: {
    titulo: "Casa em Florianópolis",
    endereco: "Rua das Flores, 123",
    m2Totais: 200,
    m2Privado: 150,
    quartos: 3,
    suites: 1,
    banheiros: 2,
    garagem: 2,
    preco: 800000,
    precoM2: 4000,
    piscina: true,
    porteiro24h: false,
    academia: false,
    vistaLivre: true,
    piscinaTermica: false,
    link: "https://example.com/listing-1",
    imageUrl: "https://example.com/image.jpg",
    starred: true,
    visited: false,
    strikethrough: false,
    addedAt: "2024-01-15",
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const mockApartmentListing = {
  id: "listing-2",
  data: {
    titulo: "Apartamento Centro",
    endereco: "Av. Brasil, 456",
    m2Totais: 100,
    m2Privado: 80,
    quartos: 2,
    suites: 1,
    banheiros: 1,
    garagem: 1,
    preco: 600000,
    precoM2: 6000,
    piscina: false,
    porteiro24h: true,
    academia: true,
    vistaLivre: false,
    piscinaTermica: true,
    andar: 5,
    tipoImovel: "apartamento" as const,
    link: "https://example.com/listing-2",
    imageUrl: null,
    starred: false,
    visited: false,
    strikethrough: false,
    addedAt: "2024-01-20",
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const mockStrikethroughListing = {
  id: "listing-3",
  data: {
    titulo: "Casa Descartada",
    endereco: "Rua Teste, 789",
    m2Totais: 150,
    m2Privado: 100,
    quartos: 2,
    suites: 0,
    banheiros: 1,
    garagem: 1,
    preco: 400000,
    precoM2: 2666,
    piscina: false,
    porteiro24h: false,
    academia: false,
    vistaLivre: false,
    piscinaTermica: false,
    link: null,
    imageUrl: null,
    starred: false,
    visited: false,
    strikethrough: true,
    discardedReason: "Muito longe",
    addedAt: "2024-01-10",
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const mockSharedData = {
  success: true,
  collection: {
    id: "col-123",
    name: "Minha Busca",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  listings: [mockListing, mockApartmentListing, mockStrikethroughListing],
  metadata: {
    totalListings: 3,
  },
}

describe("ShareClient", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Loading state", () => {
    it("shows loading spinner while fetching data", () => {
      mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<ShareClient token="test-token" />)

      expect(screen.getByText("Carregando coleção compartilhada...")).toBeInTheDocument()
    })
  })

  describe("Error state", () => {
    it("shows error message when fetch fails", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Coleção compartilhada não encontrada" }),
      })

      render(<ShareClient token="invalid-token" />)

      await waitFor(() => {
        expect(screen.getByText("Erro ao carregar coleção")).toBeInTheDocument()
      })
      expect(screen.getByText("Coleção compartilhada não encontrada")).toBeInTheDocument()
      expect(screen.getByText("Ir para página inicial")).toBeInTheDocument()
    })

    it("shows generic error when fetch throws", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"))

      render(<ShareClient token="test-token" />)

      await waitFor(() => {
        expect(screen.getByText("Erro ao carregar coleção")).toBeInTheDocument()
      })
      expect(screen.getByText("Network error")).toBeInTheDocument()
    })
  })

  describe("Not found state", () => {
    it("shows not found message when collection is null", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ collection: null, listings: [], metadata: {} }),
      })

      render(<ShareClient token="test-token" />)

      await waitFor(() => {
        expect(screen.getByText("Coleção não encontrada")).toBeInTheDocument()
      })
      expect(screen.getByText(/link de compartilhamento pode ter expirado/)).toBeInTheDocument()
    })
  })

  describe("Success state", () => {
    it("displays collection name in header", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSharedData),
      })

      render(<ShareClient token="test-token" />)

      await waitFor(() => {
        expect(screen.getByText(/Minha Busca/)).toBeInTheDocument()
      })
      expect(screen.getByText("Coleção Compartilhada")).toBeInTheDocument()
    })

    it("displays listings count correctly", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSharedData),
      })

      render(<ShareClient token="test-token" />)

      await waitFor(() => {
        // The header shows total count, and filtered count shows non-strikethrough
        expect(screen.getByText("3 imóveis nesta coleção")).toBeInTheDocument()
      })
    })

    it("displays listing titles", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSharedData),
      })

      render(<ShareClient token="test-token" />)

      await waitFor(() => {
        expect(screen.getByText("Casa em Florianópolis")).toBeInTheDocument()
      })
      expect(screen.getByText("Apartamento Centro")).toBeInTheDocument()
      // Strikethrough listing should NOT be visible (filtered out)
      expect(screen.queryByText("Casa Descartada")).not.toBeInTheDocument()
    })

    it("displays listing addresses", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSharedData),
      })

      render(<ShareClient token="test-token" />)

      await waitFor(() => {
        expect(screen.getByText("Rua das Flores, 123")).toBeInTheDocument()
      })
      expect(screen.getByText("Av. Brasil, 456")).toBeInTheDocument()
    })

    it("displays formatted prices", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSharedData),
      })

      render(<ShareClient token="test-token" />)

      await waitFor(() => {
        expect(screen.getByText("R$ 800.000")).toBeInTheDocument()
      })
      expect(screen.getByText("R$ 600.000")).toBeInTheDocument()
    })

    it("filters listings by search query", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSharedData),
      })

      render(<ShareClient token="test-token" />)

      await waitFor(() => {
        expect(screen.getByText("Casa em Florianópolis")).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText("Buscar por título ou endereço...")
      fireEvent.change(searchInput, { target: { value: "Apartamento" } })

      expect(screen.queryByText("Casa em Florianópolis")).not.toBeInTheDocument()
      expect(screen.getByText("Apartamento Centro")).toBeInTheDocument()
    })

    it("filters listings by property type", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSharedData),
      })

      render(<ShareClient token="test-token" />)

      await waitFor(() => {
        expect(screen.getByText("Casa em Florianópolis")).toBeInTheDocument()
      })

      // Click on "Aptos" filter
      const aptosButton = screen.getByRole("button", { name: /Aptos/ })
      fireEvent.click(aptosButton)

      expect(screen.queryByText("Casa em Florianópolis")).not.toBeInTheDocument()
      expect(screen.getByText("Apartamento Centro")).toBeInTheDocument()
    })

    it("shows link to home page", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSharedData),
      })

      render(<ShareClient token="test-token" />)

      await waitFor(() => {
        // There are multiple "Minha Casa" links (header and footer)
        const homeLinks = screen.getAllByRole("link", { name: /Minha Casa/ })
        expect(homeLinks.length).toBeGreaterThan(0)
        homeLinks.forEach((link) => {
          expect(link).toHaveAttribute("href", "/")
        })
      })
    })
  })

  describe("Empty collection", () => {
    it("shows empty state when collection has no listings", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          ...mockSharedData,
          listings: [],
          metadata: { totalListings: 0 },
        }),
      })

      render(<ShareClient token="test-token" />)

      await waitFor(() => {
        expect(screen.getByText("Esta coleção não possui imóveis cadastrados.")).toBeInTheDocument()
      })
    })
  })

  describe("Sorting", () => {
    it("sorts listings by price when clicking header", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSharedData),
      })

      render(<ShareClient token="test-token" />)

      await waitFor(() => {
        expect(screen.getByText("Casa em Florianópolis")).toBeInTheDocument()
      })

      // Default sort is by price desc
      const rows = screen.getAllByRole("row")
      // First data row (index 1) should be the higher priced one
      expect(rows[1]).toHaveTextContent("Casa em Florianópolis")

      // Click price header to toggle sort direction
      const priceHeader = screen.getByText("Preço")
      fireEvent.click(priceHeader)

      // After clicking, it should sort ascending
      const sortedRows = screen.getAllByRole("row")
      expect(sortedRows[1]).toHaveTextContent("Apartamento Centro")
    })
  })

  describe("Accessibility", () => {
    it("has proper ARIA roles for table", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSharedData),
      })

      render(<ShareClient token="test-token" />)

      await waitFor(() => {
        expect(screen.getByRole("table")).toBeInTheDocument()
      })
    })

    it("has search input with accessible label", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSharedData),
      })

      render(<ShareClient token="test-token" />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Buscar por título ou endereço...")).toBeInTheDocument()
      })
    })
  })
})
