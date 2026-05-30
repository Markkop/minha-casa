"use client"

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { memo } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ListingsTable } from "./listings-table"
import type { Collection, Imovel } from "../lib/api"
import type { ListingData } from "@/lib/db/schema"

const mocks = vi.hoisted(() => ({
  parseListingInput: vi.fn(),
  addListing: vi.fn(),
  updateListing: vi.fn(),
  removeListing: vi.fn(),
  checkDuplicateCandidates: vi.fn(),
  parseListingWithAI: vi.fn(),
  collection: {
    id: "collection-1",
    label: "Coleção",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    isDefault: true,
    isPublic: false,
  } as Collection,
}))

vi.mock("../lib/use-collections", () => ({
  useCollections: () => ({
    collections: [mocks.collection],
    activeCollection: mocks.collection,
    parseListingInput: mocks.parseListingInput,
    addListing: mocks.addListing,
    updateListing: mocks.updateListing,
    removeListing: mocks.removeListing,
    getListingDisplayTitle: (listing: Imovel) => listing.titulo,
  }),
}))

vi.mock("../lib/api", () => ({
  checkDuplicateCandidates: mocks.checkDuplicateCandidates,
  parseListingWithAI: mocks.parseListingWithAI,
}))

vi.mock("./edit-modal", () => ({
  EditModal: () => null,
}))

vi.mock("./image-modal", () => ({
  ImageModal: () => null,
}))

vi.mock("./quick-reparse-modal", () => ({
  QuickReparseModal: () => null,
}))

vi.mock("./listing-mobile-card", () => ({
  ListingMobileCard: memo(function MockListingMobileCard({ imovel }: { imovel: Imovel }) {
    return <div data-testid={`mobile-${imovel.id}`} />
  }),
}))

vi.mock("./listing-table-row", () => ({
  ListingTableRow: memo(function MockListingTableRow({ imovel }: { imovel: Imovel }) {
    return (
      <tr data-testid={`row-${imovel.id}`}>
        <td>{imovel.titulo}</td>
      </tr>
    )
  }),
}))

function listing(overrides: Partial<Imovel> = {}): Imovel {
  return {
    id: "listing-1",
    titulo: "Casa",
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
    contactName: null,
    contactNumber: null,
    starred: false,
    visited: false,
    strikethrough: false,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

function parsedListing(overrides: Partial<ListingData> = {}): ListingData {
  return {
    titulo: "Casa nova",
    endereco: "Rua nova",
    bairro: null,
    cidade: null,
    m2Totais: null,
    m2Privado: null,
    quartos: null,
    suites: null,
    banheiros: null,
    garagem: null,
    preco: null,
    precoM2: null,
    piscina: null,
    porteiro24h: null,
    academia: null,
    vistaLivre: null,
    piscinaTermica: null,
    tipoImovel: null,
    link: null,
    addedAt: "2026-01-01",
    ...overrides,
  }
}

function mobileList() {
  return within(screen.getByTestId("listings-mobile-list"))
}

function desktopTable() {
  return within(screen.getByTestId("listings-desktop-table"))
}

function mockClipboard(text = "") {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      read: vi.fn().mockRejectedValue(new Error("denied")),
      readText: vi.fn().mockResolvedValue(text),
      writeText: vi.fn(),
    },
  })
  return navigator.clipboard as Clipboard & {
    readText: ReturnType<typeof vi.fn>
  }
}

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe("ListingsTable inline add flow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    mockClipboard("")
    mocks.checkDuplicateCandidates.mockResolvedValue([])
    mocks.addListing.mockResolvedValue(listing({ id: "created", titulo: "Criado" }))
  })

  it("toggles the inline add input empty and splits search/add space on desktop", async () => {
    const clipboard = mockClipboard("https://example.com/imovel")

    render(<ListingsTable listings={[listing()]} />)

    fireEvent.click(screen.getByLabelText("Adicionar imóvel"))

    const addInput = await screen.findByPlaceholderText("Cole link, texto ou arquivo aqui...")
    expect(addInput).toHaveValue("")
    expect(clipboard.readText).not.toHaveBeenCalled()

    const searchInput = screen.getByPlaceholderText("Buscar por título ou endereço...")
    expect(searchInput.parentElement).toHaveClass("md:basis-1/2")
    expect(addInput.closest(".md\\:basis-1\\/2")).not.toBeNull()
    expect(
      addInput.compareDocumentPosition(searchInput) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it("replaces search with add input using mobile toolbar classes", async () => {
    mockMatchMedia(true)

    render(<ListingsTable listings={[listing()]} />)

    fireEvent.click(screen.getByLabelText("Adicionar imóvel"))

    const addInput = await screen.findByPlaceholderText("Cole link, texto ou arquivo aqui...")
    const searchWrapper = screen.getByPlaceholderText("Buscar...").parentElement

    expect(searchWrapper).toHaveClass("max-md:hidden")
    expect(addInput.closest(".max-md\\:flex-1")).not.toBeNull()
  })

  it("adds from clipboard shortcut without opening or filling the inline input", async () => {
    const clipboard = mockClipboard("https://example.com/imovel")
    const data = parsedListing({ link: "https://example.com/imovel" })
    let resolveParse: (value: ListingData[]) => void = () => {}
    mocks.parseListingInput.mockReturnValue(
      new Promise<ListingData[]>((resolve) => {
        resolveParse = resolve
      })
    )

    render(<ListingsTable listings={[listing()]} />)

    fireEvent.click(screen.getByLabelText("Adicionar da área de transferência"))

    await waitFor(() => expect(clipboard.readText).toHaveBeenCalled())
    expect(await mobileList().findByText("Processando...")).toBeInTheDocument()
    const addInput = screen.queryByPlaceholderText("Cole link, texto ou arquivo aqui...")
    expect(addInput).toHaveValue("")

    resolveParse([data])
    await waitFor(() => {
      expect(mocks.parseListingInput).toHaveBeenCalledWith({
        kind: "url",
        url: "https://example.com/imovel",
      })
      expect(mocks.addListing).toHaveBeenCalledWith(data)
    })
  })

  it("shows an error when clipboard shortcut has no content", async () => {
    mockClipboard("")

    render(<ListingsTable listings={[listing()]} />)

    fireEvent.click(screen.getByLabelText("Adicionar da área de transferência"))

    expect(
      await screen.findByText("Nada na área de transferência para adicionar.")
    ).toBeInTheDocument()
    expect(mocks.parseListingInput).not.toHaveBeenCalled()
  })

  it("shows an error when clipboard read is denied", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        read: vi.fn().mockRejectedValue(new Error("denied")),
        readText: vi.fn().mockRejectedValue(new Error("denied")),
        writeText: vi.fn(),
      },
    })

    render(<ListingsTable listings={[listing()]} />)

    fireEvent.click(screen.getByLabelText("Adicionar da área de transferência"))

    expect(
      await screen.findByText(
        "Não foi possível ler a área de transferência. Permita o acesso ou use o campo manual."
      )
    ).toBeInTheDocument()
    expect(mocks.parseListingInput).not.toHaveBeenCalled()
  })

  it("submits URL input with Enter and creates a processing row immediately", async () => {
    const data = parsedListing({ link: "https://example.com/ad" })
    let resolveParse: (value: ListingData[]) => void = () => {}
    mocks.parseListingInput.mockReturnValue(
      new Promise<ListingData[]>((resolve) => {
        resolveParse = resolve
      })
    )

    render(<ListingsTable listings={[listing()]} />)

    fireEvent.click(screen.getByLabelText("Adicionar imóvel"))
    const addInput = await screen.findByPlaceholderText("Cole link, texto ou arquivo aqui...")
    fireEvent.change(addInput, { target: { value: "example.com/ad" } })
    fireEvent.keyDown(addInput, { key: "Enter" })

    expect(await mobileList().findByText("Processando...")).toBeInTheDocument()
    resolveParse([data])
    await waitFor(() => {
      expect(mocks.parseListingInput).toHaveBeenCalledWith({
        kind: "url",
        url: "https://example.com/ad",
      })
      expect(mocks.addListing).toHaveBeenCalledWith(data)
    })
  })

  it("detects duplicate URL before AI parse and parses only after accept", async () => {
    const data = parsedListing({ link: "https://example.com/existing" })
    mocks.checkDuplicateCandidates.mockResolvedValueOnce([
      { listingId: "existing", score: 1, reason: "same_url" },
    ])
    mocks.parseListingInput.mockResolvedValue([data])

    render(<ListingsTable listings={[listing()]} />)

    fireEvent.click(screen.getByLabelText("Adicionar imóvel"))
    const addInput = await screen.findByPlaceholderText("Cole link, texto ou arquivo aqui...")
    fireEvent.change(addInput, { target: { value: "https://example.com/existing" } })
    fireEvent.click(screen.getByLabelText("Enviar imóvel"))

    expect(await mobileList().findByText("Possível duplicado")).toBeInTheDocument()
    expect(mobileList().getByText("Motivo: mesmo link")).toBeInTheDocument()
    expect(mocks.checkDuplicateCandidates).toHaveBeenCalledWith(
      "collection-1",
      expect.objectContaining({ link: "https://example.com/existing" })
    )
    expect(mocks.parseListingInput).not.toHaveBeenCalled()

    fireEvent.click(screen.getByLabelText("Aceitar imóvel duplicado"))

    await waitFor(() => {
      expect(mocks.parseListingInput).toHaveBeenCalledWith({
        kind: "url",
        url: "https://example.com/existing",
      })
      expect(mocks.addListing).toHaveBeenCalledWith(data)
    })
  })

  it("shows duplicate confirm/reject actions inline and saves when confirmed", async () => {
    const data = parsedListing({ preco: 750000, m2Totais: 120, m2Privado: 100 })
    mocks.parseListingInput.mockResolvedValue([data])
    mocks.checkDuplicateCandidates
      .mockResolvedValueOnce([{ listingId: "existing", score: 95, reason: "same_url" }])
      .mockResolvedValueOnce([])

    render(<ListingsTable listings={[listing()]} />)

    fireEvent.click(screen.getByLabelText("Adicionar imóvel"))
    const addInput = await screen.findByPlaceholderText("Cole link, texto ou arquivo aqui...")
    fireEvent.change(addInput, { target: { value: "Texto do anúncio" } })
    fireEvent.click(screen.getByLabelText("Enviar imóvel"))

    expect(await mobileList().findByText("Possível duplicado")).toBeInTheDocument()
    expect(mobileList().getByText("Motivo: mesmo link")).toBeInTheDocument()
    expect(desktopTable().getByText("R$ 750.000")).toBeInTheDocument()
    expect(desktopTable().getByText("120 m²")).toBeInTheDocument()
    expect(screen.getByLabelText("Aceitar imóvel duplicado")).toBeInTheDocument()
    expect(screen.getByLabelText("Rejeitar imóvel duplicado")).toBeInTheDocument()
    expect(screen.queryByLabelText("Confirmar imóvel duplicado")).not.toBeInTheDocument()

    fireEvent.click(screen.getByLabelText("Aceitar imóvel duplicado"))

    await waitFor(() => expect(mocks.addListing).toHaveBeenCalledWith(data))
  })

  it("reviews multiple parsed listings in one compact row before importing selected items", async () => {
    const first = parsedListing({ titulo: "Casa A" })
    const second = parsedListing({ titulo: "Casa B" })
    mocks.parseListingInput.mockResolvedValue([first, second])

    render(<ListingsTable listings={[listing()]} />)

    fireEvent.click(screen.getByLabelText("Adicionar imóvel"))
    const addInput = await screen.findByPlaceholderText("Cole link, texto ou arquivo aqui...")
    fireEvent.change(addInput, { target: { value: "Dois anúncios" } })
    fireEvent.keyDown(addInput, { key: "Enter" })

    expect(await mobileList().findByText("2 imóveis encontrados")).toBeInTheDocument()
    expect(mobileList().getByRole("button", { name: "Importar (2)" })).toBeInTheDocument()

    fireEvent.click(mobileList().getByRole("button", { name: "Importar (2)" }))

    await waitFor(() => {
      expect(mocks.addListing).toHaveBeenCalledTimes(2)
      expect(mocks.addListing).toHaveBeenNthCalledWith(1, first)
      expect(mocks.addListing).toHaveBeenNthCalledWith(2, second)
    })
  })

  it("opens the hidden file picker from the upload icon", async () => {
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {})

    render(<ListingsTable listings={[listing()]} />)

    fireEvent.click(screen.getByLabelText("Adicionar imóvel"))
    await screen.findByPlaceholderText("Cole link, texto ou arquivo aqui...")
    fireEvent.click(screen.getByLabelText("Selecionar arquivo"))

    expect(clickSpy).toHaveBeenCalled()
    clickSpy.mockRestore()
  })

  it("shows selected files as removable pills and blocks text while files are selected", async () => {
    const { container } = render(<ListingsTable listings={[listing()]} />)

    fireEvent.click(screen.getByLabelText("Adicionar imóvel"))
    const addInput = await screen.findByPlaceholderText("Cole link, texto ou arquivo aqui...")
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const first = new File(["image"], "fachada.png", { type: "image/png" })
    const second = new File(["pdf"], "memorial.pdf", { type: "application/pdf" })

    fireEvent.change(fileInput, { target: { files: [first, second] } })

    expect(screen.getByText("fachada.png")).toBeInTheDocument()
    expect(screen.getByText("memorial.pdf")).toBeInTheDocument()
    expect(addInput).toHaveAttribute("readonly")

    fireEvent.change(addInput, { target: { value: "texto ignorado" } })
    expect(addInput).toHaveValue("")

    fireEvent.click(screen.getByLabelText("Remover fachada.png"))
    expect(screen.queryByText("fachada.png")).not.toBeInTheDocument()
    expect(screen.getByText("memorial.pdf")).toBeInTheDocument()
  })
})

describe("ListingsTable mobile toolbar", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    mockClipboard("")
  })

  it("shows sort control instead of column picker in the mobile toolbar slot", () => {
    render(<ListingsTable listings={[listing()]} />)

    expect(screen.getByLabelText("Ordenar")).toBeInTheDocument()
    expect(screen.getByLabelText("Colunas visíveis").closest(".hidden")).not.toBeNull()
  })

  it("reorders mobile listings when a sort option is selected", async () => {
    render(
      <ListingsTable
        listings={[
          listing({ id: "listing-a", titulo: "Alpha", preco: 200000 }),
          listing({ id: "listing-b", titulo: "Beta", preco: 900000 }),
        ]}
      />
    )

    const initialOrder = mobileList()
      .getAllByTestId(/^mobile-/)
      .map((node) => node.getAttribute("data-testid"))
    expect(initialOrder).toEqual(["mobile-listing-b", "mobile-listing-a"])

    fireEvent.click(screen.getByLabelText("Ordenar"))
    fireEvent.click(screen.getByRole("button", { name: "Preço" }))

    const sortedOrder = mobileList()
      .getAllByTestId(/^mobile-/)
      .map((node) => node.getAttribute("data-testid"))
    expect(sortedOrder).toEqual(["mobile-listing-a", "mobile-listing-b"])
  })
})
