"use client"

import { render, screen } from "@testing-library/react"
import { memo } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ListingsTable } from "./listings-table"
import type { Collection, Imovel } from "../lib/api"

const rowRenderCounts = vi.hoisted(() => new Map<string, number>())
const mocks = vi.hoisted(() => ({
  updateListing: vi.fn(),
  removeListing: vi.fn(),
  collection: {
    id: "collection-1",
    label: "Coleção",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    isDefault: true,
    isPublic: false,
  } as Collection,
  collections: [] as Collection[],
}))

mocks.collections.push(mocks.collection)

vi.mock("../lib/use-collections", () => ({
  useCollections: () => ({
    collections: mocks.collections,
    activeCollection: mocks.collection,
    updateListing: mocks.updateListing,
    removeListing: mocks.removeListing,
  }),
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

vi.mock("./listing-table-row", () => ({
  ListingTableRow: memo(
    function MockListingTableRow({ imovel }: { imovel: Imovel } & Record<string, unknown>) {
      rowRenderCounts.set(imovel.id, (rowRenderCounts.get(imovel.id) ?? 0) + 1)
      return (
        <tr data-testid={`row-${imovel.id}`}>
          <td>{imovel.titulo}</td>
        </tr>
      )
    },
    (prev: Record<string, unknown> & { imovel: Imovel }, next: Record<string, unknown> & { imovel: Imovel }) =>
      prev.imovel === next.imovel &&
      prev.visibleColumns === next.visibleColumns &&
      prev.imageColumnView === next.imageColumnView &&
      prev.enabledMetricVariants === next.enabledMetricVariants &&
      prev.propertyDisplay === next.propertyDisplay &&
      prev.activeMetricVariant === next.activeMetricVariant &&
      prev.uniqueContacts === next.uniqueContacts &&
      prev.hasOtherCollections === next.hasOtherCollections &&
      prev.collections === next.collections &&
      prev.activeCollectionId === next.activeCollectionId &&
      prev.updateListing === next.updateListing &&
      prev.removeListing === next.removeListing &&
      prev.openImageModal === next.openImageModal &&
      prev.openEditListing === next.openEditListing &&
      prev.onQuickReparseRequest === next.onQuickReparseRequest &&
      prev.onQuickReparseDetected === next.onQuickReparseDetected
  ),
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
    contactName: "Contato",
    contactNumber: "48999990000",
    starred: false,
    visited: false,
    strikethrough: false,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

describe("ListingsTable row stability", () => {
  beforeEach(() => {
    rowRenderCounts.clear()
    mocks.updateListing.mockReset()
    mocks.removeListing.mockReset()
    window.localStorage.clear()
  })

  it("does not rerender unaffected rows when only one listing image status changes", () => {
    const first = listing({ id: "listing-1", imageIngestionStatus: "pending" })
    const second = listing({ id: "listing-2", titulo: "Casa 2" })

    const { rerender } = render(<ListingsTable listings={[first, second]} />)

    expect(screen.getByTestId("row-listing-1")).toBeInTheDocument()
    expect(screen.getByTestId("row-listing-2")).toBeInTheDocument()
    rowRenderCounts.clear()

    rerender(
      <ListingsTable
        listings={[
          { ...first, imageIngestionStatus: "ready", imageUrl: "/ready.jpg" },
          second,
        ]}
      />
    )

    expect(rowRenderCounts.get("listing-1")).toBe(1)
    expect(rowRenderCounts.get("listing-2") ?? 0).toBe(0)
  })
})
