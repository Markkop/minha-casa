"use client"

import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { CollectionsProvider, useCollections } from "./use-collections"
import type { ApiListing, Collection, Imovel } from "./api"
import type { ListingData } from "@/lib/db/schema"

const apiMocks = vi.hoisted(() => ({
  fetchCollections: vi.fn(),
  fetchListings: vi.fn(),
  fetchListing: vi.fn(),
  createListing: vi.fn(),
  updateApiListing: vi.fn(),
  deleteListing: vi.fn(),
}))

vi.mock("./api", async () => {
  const actual = await vi.importActual<typeof import("./api")>("./api")
  return {
    ...actual,
    fetchCollections: apiMocks.fetchCollections,
    fetchListings: apiMocks.fetchListings,
    fetchListing: apiMocks.fetchListing,
    createListing: apiMocks.createListing,
    updateApiListing: apiMocks.updateApiListing,
    deleteListing: apiMocks.deleteListing,
  }
})

vi.mock("@/components/organization-switcher", () => ({
  getStoredOrgContext: () => ({ type: "personal" }),
}))

const collection: Collection = {
  id: "collection-1",
  label: "Coleção",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  isDefault: true,
  isPublic: false,
}

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
    starred: false,
    visited: false,
    strikethrough: false,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

function apiListing(row: Imovel): ApiListing {
  return {
    id: row.id,
    collectionId: collection.id,
    createdAt: row.createdAt,
    updatedAt: row.createdAt,
    data: {
      titulo: row.titulo,
      endereco: row.endereco,
      bairro: row.bairro,
      cidade: row.cidade,
      m2Totais: row.m2Totais,
      m2Privado: row.m2Privado,
      quartos: row.quartos,
      suites: row.suites,
      banheiros: row.banheiros,
      garagem: row.garagem,
      preco: row.preco,
      precoM2: row.precoM2,
      piscina: row.piscina,
      porteiro24h: row.porteiro24h,
      academia: row.academia,
      vistaLivre: row.vistaLivre,
      piscinaTermica: row.piscinaTermica,
      tipoImovel: row.tipoImovel,
      link: row.link,
      imageUrl: row.imageUrl,
      imageUrls: row.imageUrls,
      imageStorageKeys: row.imageStorageKeys,
      imageIngestionStatus: row.imageIngestionStatus,
      imageIngestionError: row.imageIngestionError,
      starred: row.starred,
      visited: row.visited,
      strikethrough: row.strikethrough,
    } as ListingData,
  }
}

function wrapper({ children }: { children: ReactNode }) {
  return <CollectionsProvider>{children}</CollectionsProvider>
}

async function renderLoadedCollections(initialListings: Imovel[]) {
  apiMocks.fetchCollections.mockResolvedValue([collection])
  apiMocks.fetchListings.mockResolvedValue(initialListings)
  const rendered = renderHook(() => useCollections(), { wrapper })

  await waitFor(() => {
    expect(rendered.result.current.listings).toHaveLength(initialListings.length)
  })

  return rendered
}

beforeEach(() => {
  vi.useRealTimers()
  apiMocks.fetchCollections.mockReset()
  apiMocks.fetchListings.mockReset()
  apiMocks.fetchListing.mockReset()
  apiMocks.createListing.mockReset()
  apiMocks.updateApiListing.mockReset()
  apiMocks.deleteListing.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("useCollections listing refresh behavior", () => {
  it("refreshListing updates only the target listing without reloading the table", async () => {
    const first = listing({ id: "listing-1", imageIngestionStatus: "pending" })
    const second = listing({ id: "listing-2", titulo: "Casa 2" })
    const rendered = await renderLoadedCollections([first, second])

    const originalSecond = rendered.result.current.listings[1]
    apiMocks.fetchListing.mockResolvedValue(
      listing({ id: "listing-1", imageIngestionStatus: "ready", imageUrl: "/image.jpg" })
    )

    await act(async () => {
      await rendered.result.current.refreshListing("listing-1")
    })

    expect(apiMocks.fetchListings).toHaveBeenCalledTimes(1)
    expect(rendered.result.current.isLoadingListings).toBe(false)
    expect(rendered.result.current.listings[0]).toMatchObject({
      id: "listing-1",
      imageIngestionStatus: "ready",
      imageUrl: "/image.jpg",
    })
    expect(rendered.result.current.listings[1]).toBe(originalSecond)
  })

  it("add, update and delete mutate local listing state without global reloads", async () => {
    const first = listing({ id: "listing-1" })
    const rendered = await renderLoadedCollections([first])

    apiMocks.createListing.mockResolvedValue(listing({ id: "listing-2", titulo: "Nova" }))
    apiMocks.updateApiListing.mockResolvedValue(listing({ id: "listing-2", titulo: "Atualizada" }))
    apiMocks.deleteListing.mockResolvedValue(undefined)

    await act(async () => {
      await rendered.result.current.addListing(apiListing(listing({ id: "listing-2" })).data)
      await rendered.result.current.updateListing("listing-2", { titulo: "Atualizada" })
      await rendered.result.current.removeListing("listing-1")
    })

    expect(apiMocks.fetchListings).toHaveBeenCalledTimes(1)
    expect(rendered.result.current.listings.map((row) => row.id)).toEqual(["listing-2"])
    expect(rendered.result.current.listings[0].titulo).toBe("Atualizada")
  })

  it("polls ingesting listings individually without toggling listing loading", async () => {
    vi.useFakeTimers()
    const first = listing({ id: "listing-1", imageIngestionStatus: "pending" })
    const second = listing({ id: "listing-2", titulo: "Casa 2" })
    apiMocks.fetchCollections.mockResolvedValue([collection])
    apiMocks.fetchListings.mockResolvedValue([first, second])
    const rendered = renderHook(() => useCollections(), { wrapper })

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(rendered.result.current.listings).toHaveLength(2)

    apiMocks.fetchListing.mockResolvedValue(
      listing({ id: "listing-1", imageIngestionStatus: "ready", imageUrl: "/ready.jpg" })
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })

    expect(apiMocks.fetchListing).toHaveBeenCalledWith(collection.id, "listing-1")
    expect(apiMocks.fetchListings).toHaveBeenCalledTimes(1)
    expect(rendered.result.current.isLoadingListings).toBe(false)
    expect(rendered.result.current.listings[0].imageIngestionStatus).toBe("ready")
  })
})
