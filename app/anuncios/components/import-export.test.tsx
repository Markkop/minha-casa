"use client"

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { ExportModal } from "./export-modal"
import { ImportModal } from "./import-modal"
import type { Collection, Imovel } from "../lib/api"

// Mock the useCollections hook
const mockUseCollections = vi.fn()
vi.mock("../lib/use-collections", () => ({
  useCollections: () => mockUseCollections(),
}))

// Mock the API functions
vi.mock("../lib/api", async () => {
  const actual = await vi.importActual("../lib/api")
  return {
    ...actual,
    fetchListings: vi.fn(),
    createListing: vi.fn(),
  }
})

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
})

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => "blob:test")
global.URL.revokeObjectURL = vi.fn()

const mockCollection: Collection = {
  id: "col-1",
  label: "Test Collection",
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-02T00:00:00Z",
  isDefault: true,
  isPublic: false,
}

const mockListings: Imovel[] = [
  {
    id: "listing-1",
    titulo: "Test Property",
    endereco: "Test Address",
    m2Totais: 100,
    m2Privado: 80,
    quartos: 3,
    suites: 1,
    banheiros: 2,
    garagem: 2,
    preco: 500000,
    precoM2: 5000,
    piscina: true,
    porteiro24h: false,
    academia: true,
    vistaLivre: false,
    piscinaTermica: null,
    andar: 5,
    tipoImovel: "apartamento",
    link: "https://example.com",
    imageUrl: null,
    contactName: "John",
    contactNumber: "123456789",
    starred: true,
    visited: false,
    strikethrough: false,
    discardedReason: null,
    customLat: null,
    customLng: null,
    createdAt: "2025-01-01T00:00:00Z",
    addedAt: "2025-01-01",
  },
]

describe("ExportModal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCollections.mockReturnValue({
      activeCollection: mockCollection,
      listings: mockListings,
      collections: [mockCollection],
      orgContext: { type: "personal" },
    })
  })

  it("should render export modal when open", () => {
    render(<ExportModal isOpen={true} onClose={() => {}} />)
    
    expect(screen.getByText("Exportar")).toBeInTheDocument()
    expect(screen.getByText("Coleção atual")).toBeInTheDocument()
    expect(screen.getByText("Todas as coleções")).toBeInTheDocument()
  })

  it("should not render when closed", () => {
    render(<ExportModal isOpen={false} onClose={() => {}} />)
    
    expect(screen.queryByText("Exportar")).not.toBeInTheDocument()
  })

  it("should show collection info when exporting current collection", () => {
    render(<ExportModal isOpen={true} onClose={() => {}} />)
    
    expect(screen.getByText(/Test Collection/)).toBeInTheDocument()
    expect(screen.getByText(/1 imóveis/)).toBeInTheDocument()
  })

  it("should allow switching between export modes", () => {
    render(<ExportModal isOpen={true} onClose={() => {}} />)
    
    const allButton = screen.getByText("Todas as coleções")
    fireEvent.click(allButton)
    
    expect(screen.getByText(/1 coleções/)).toBeInTheDocument()
  })

  it("should copy JSON to clipboard", async () => {
    render(<ExportModal isOpen={true} onClose={() => {}} />)
    
    const copyButton = screen.getByText("Copiar JSON")
    fireEvent.click(copyButton)
    
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled()
    })
  })

  it("should call onClose when close button is clicked", () => {
    const onClose = vi.fn()
    render(<ExportModal isOpen={true} onClose={onClose} />)
    
    const closeButton = screen.getByText("Fechar")
    fireEvent.click(closeButton)
    
    expect(onClose).toHaveBeenCalled()
  })

  it("should disable export buttons when no collection or listings", () => {
    mockUseCollections.mockReturnValue({
      activeCollection: null,
      listings: [],
      collections: [],
      orgContext: { type: "personal" },
    })
    
    render(<ExportModal isOpen={true} onClose={() => {}} />)
    
    const downloadButton = screen.getByText("Baixar JSON")
    expect(downloadButton).toBeDisabled()
  })
})

describe("ImportModal", () => {
  const mockCreateCollection = vi.fn()
  const mockAddListing = vi.fn()
  const mockSetActiveCollection = vi.fn()
  const mockLoadListings = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateCollection.mockResolvedValue({ id: "new-col", label: "New Collection" })
    mockAddListing.mockResolvedValue({ id: "new-listing" })
    
    mockUseCollections.mockReturnValue({
      collections: [mockCollection],
      activeCollection: mockCollection,
      createCollection: mockCreateCollection,
      addListing: mockAddListing,
      setActiveCollection: mockSetActiveCollection,
      loadListings: mockLoadListings,
    })
  })

  it("should render import modal when open", () => {
    render(<ImportModal isOpen={true} onClose={() => {}} />)
    
    expect(screen.getByText("Importar")).toBeInTheDocument()
    expect(screen.getByText("Nova coleção")).toBeInTheDocument()
    expect(screen.getByText("Coleção existente")).toBeInTheDocument()
  })

  it("should not render when closed", () => {
    render(<ImportModal isOpen={false} onClose={() => {}} />)
    
    expect(screen.queryByText("Importar")).not.toBeInTheDocument()
  })

  it("should allow switching between import modes", () => {
    render(<ImportModal isOpen={true} onClose={() => {}} />)
    
    const existingButton = screen.getByText("Coleção existente")
    fireEvent.click(existingButton)
    
    expect(screen.getByText("Selecione a coleção")).toBeInTheDocument()
  })

  it("should show collection selector when importing to existing collection", () => {
    render(<ImportModal isOpen={true} onClose={() => {}} />)
    
    const existingButton = screen.getByText("Coleção existente")
    fireEvent.click(existingButton)
    
    expect(screen.getByRole("combobox")).toBeInTheDocument()
  })

  it("should parse and import JSON data", async () => {
    const onImportSuccess = vi.fn()
    const onDataChange = vi.fn()
    
    render(
      <ImportModal 
        isOpen={true} 
        onClose={() => {}} 
        onImportSuccess={onImportSuccess}
        onDataChange={onDataChange}
      />
    )
    
    const textarea = screen.getByPlaceholderText("Cole o JSON aqui...")
    const validJson = JSON.stringify({
      collection: { label: "Imported Collection" },
      listings: [
        { titulo: "Property 1", endereco: "Address 1" }
      ]
    })
    
    fireEvent.change(textarea, { target: { value: validJson } })
    
    const importButton = screen.getByText("Processar Importação")
    fireEvent.click(importButton)
    
    await waitFor(() => {
      expect(mockCreateCollection).toHaveBeenCalledWith("Imported Collection")
    })
    
    await waitFor(() => {
      expect(mockAddListing).toHaveBeenCalled()
    })
  })

  it("should show error for invalid JSON", async () => {
    render(<ImportModal isOpen={true} onClose={() => {}} />)
    
    const textarea = screen.getByPlaceholderText("Cole o JSON aqui...")
    fireEvent.change(textarea, { target: { value: "invalid json" } })
    
    const importButton = screen.getByText("Processar Importação")
    fireEvent.click(importButton)
    
    await waitFor(() => {
      expect(screen.getByText(/Unexpected token/i)).toBeInTheDocument()
    })
  })

  it("should show error when no valid listings found", async () => {
    render(<ImportModal isOpen={true} onClose={() => {}} />)
    
    const textarea = screen.getByPlaceholderText("Cole o JSON aqui...")
    const emptyJson = JSON.stringify({
      collection: { label: "Empty Collection" },
      listings: []
    })
    
    fireEvent.change(textarea, { target: { value: emptyJson } })
    
    const importButton = screen.getByText("Processar Importação")
    fireEvent.click(importButton)
    
    await waitFor(() => {
      expect(screen.getByText(/Nenhum imóvel válido/)).toBeInTheDocument()
    })
  })

  it("should handle legacy array format", async () => {
    render(<ImportModal isOpen={true} onClose={() => {}} />)
    
    const textarea = screen.getByPlaceholderText("Cole o JSON aqui...")
    const legacyJson = JSON.stringify([
      { titulo: "Property 1", endereco: "Address 1" },
      { titulo: "Property 2", endereco: "Address 2" }
    ])
    
    fireEvent.change(textarea, { target: { value: legacyJson } })
    
    const importButton = screen.getByText("Processar Importação")
    fireEvent.click(importButton)
    
    await waitFor(() => {
      expect(mockCreateCollection).toHaveBeenCalled()
    })
  })

  it("should handle full export format with multiple collections", async () => {
    render(<ImportModal isOpen={true} onClose={() => {}} />)
    
    const textarea = screen.getByPlaceholderText("Cole o JSON aqui...")
    const fullExportJson = JSON.stringify({
      version: "1.0",
      collections: [
        {
          collection: { label: "Collection 1" },
          listings: [{ titulo: "Property 1", endereco: "Address 1" }]
        },
        {
          collection: { label: "Collection 2" },
          listings: [{ titulo: "Property 2", endereco: "Address 2" }]
        }
      ]
    })
    
    fireEvent.change(textarea, { target: { value: fullExportJson } })
    
    const importButton = screen.getByText("Processar Importação")
    fireEvent.click(importButton)
    
    await waitFor(() => {
      expect(mockCreateCollection).toHaveBeenCalledTimes(2)
    })
  })

  it("should handle tipoImovel field correctly", async () => {
    render(<ImportModal isOpen={true} onClose={() => {}} />)
    
    const textarea = screen.getByPlaceholderText("Cole o JSON aqui...")
    const jsonWithTipoImovel = JSON.stringify({
      collection: { label: "Test Collection" },
      listings: [
        { titulo: "Apartment", endereco: "Address 1", tipoImovel: "apartamento" },
        { titulo: "House", endereco: "Address 2", tipoImovel: "casa" },
        { titulo: "Invalid", endereco: "Address 3", tipoImovel: "invalid" }
      ]
    })
    
    fireEvent.change(textarea, { target: { value: jsonWithTipoImovel } })
    
    const importButton = screen.getByText("Processar Importação")
    fireEvent.click(importButton)
    
    await waitFor(() => {
      expect(mockAddListing).toHaveBeenCalledTimes(3)
    })
    
    // Check that tipoImovel was correctly parsed
    const calls = mockAddListing.mock.calls
    expect(calls[0][0].tipoImovel).toBe("apartamento")
    expect(calls[1][0].tipoImovel).toBe("casa")
    expect(calls[2][0].tipoImovel).toBe(null) // Invalid value should be null
  })

  it("should disable import button when no text is provided", () => {
    render(<ImportModal isOpen={true} onClose={() => {}} />)
    
    const importButton = screen.getByText("Processar Importação")
    expect(importButton).toBeDisabled()
  })

  it("should call onClose when close button is clicked", () => {
    const onClose = vi.fn()
    render(<ImportModal isOpen={true} onClose={onClose} />)
    
    const closeButton = screen.getByText("Fechar")
    fireEvent.click(closeButton)
    
    expect(onClose).toHaveBeenCalled()
  })

  it("should generate unique collection name if name already exists", async () => {
    mockUseCollections.mockReturnValue({
      collections: [{ id: "col-1", label: "Imported Collection" }],
      activeCollection: mockCollection,
      createCollection: mockCreateCollection,
      addListing: mockAddListing,
      setActiveCollection: mockSetActiveCollection,
      loadListings: mockLoadListings,
    })
    
    render(<ImportModal isOpen={true} onClose={() => {}} />)
    
    const textarea = screen.getByPlaceholderText("Cole o JSON aqui...")
    const validJson = JSON.stringify({
      collection: { label: "Imported Collection" },
      listings: [{ titulo: "Property 1", endereco: "Address 1" }]
    })
    
    fireEvent.change(textarea, { target: { value: validJson } })
    
    const importButton = screen.getByText("Processar Importação")
    fireEvent.click(importButton)
    
    await waitFor(() => {
      expect(mockCreateCollection).toHaveBeenCalledWith("Imported Collection (2)")
    })
  })
})

describe("Export Data Format", () => {
  it("should include version number in export", async () => {
    mockUseCollections.mockReturnValue({
      activeCollection: mockCollection,
      listings: mockListings,
      collections: [mockCollection],
      orgContext: { type: "personal" },
    })
    
    render(<ExportModal isOpen={true} onClose={() => {}} />)
    
    const copyButton = screen.getByText("Copiar JSON")
    fireEvent.click(copyButton)
    
    await waitFor(() => {
      const clipboardCall = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0][0]
      const exportedData = JSON.parse(clipboardCall)
      
      expect(exportedData.version).toBe("1.0")
      expect(exportedData.exportedAt).toBeDefined()
      expect(exportedData.context).toBe("personal")
    })
  })

  it("should include all listing fields in export", async () => {
    mockUseCollections.mockReturnValue({
      activeCollection: mockCollection,
      listings: mockListings,
      collections: [mockCollection],
      orgContext: { type: "personal" },
    })
    
    render(<ExportModal isOpen={true} onClose={() => {}} />)
    
    const copyButton = screen.getByText("Copiar JSON")
    fireEvent.click(copyButton)
    
    await waitFor(() => {
      const clipboardCall = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0][0]
      const exportedData = JSON.parse(clipboardCall)
      
      const listing = exportedData.listings[0]
      expect(listing.titulo).toBe("Test Property")
      expect(listing.tipoImovel).toBe("apartamento")
      expect(listing.starred).toBe(true)
      expect(listing.preco).toBe(500000)
    })
  })
})
