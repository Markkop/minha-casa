"use client"

import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ListingMobileCardBackdrop } from "./listing-mobile-card-backdrop"
import type { Imovel } from "../lib/api"

const backdropRenderCounts = vi.hoisted(() => new Map<string, number>())

vi.mock("./listing-thumbnail-image", () => ({
  ListingThumbnailImage: ({ listingId, src }: { listingId: string; src: string }) => {
    backdropRenderCounts.set(
      listingId,
      (backdropRenderCounts.get(listingId) ?? 0) + 1
    )
    return <img data-testid={`thumb-${listingId}`} src={src} alt="" />
  },
}))

vi.mock("./listing-location-mini-map", () => ({
  ListingLocationMiniMap: () => <div data-testid="mini-map" />,
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
    imageUrl: "https://example.com/photo.jpg",
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

describe("ListingMobileCardBackdrop", () => {
  beforeEach(() => {
    backdropRenderCounts.clear()
  })

  it("does not rerender when only unrelated parent props change", () => {
    const imovel = listing()
    const openModal = vi.fn()

    const { rerender } = render(
      <ListingMobileCardBackdrop
        imovel={imovel}
        view="image"
        onOpenImageModal={openModal}
      />
    )

    expect(screen.getByTestId("thumb-listing-1")).toBeInTheDocument()
    backdropRenderCounts.clear()

    rerender(
      <ListingMobileCardBackdrop
        imovel={imovel}
        view="image"
        onOpenImageModal={vi.fn()}
      />
    )

    expect(backdropRenderCounts.get("listing-1") ?? 0).toBe(0)
  })
})
