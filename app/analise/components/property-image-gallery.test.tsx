"use client"

import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { Imovel } from "@/app/anuncios/lib/api"
import { PropertyImageGallery } from "./property-image-gallery"

const imageUrls = [
  "https://example.com/foto-1.jpg",
  "https://example.com/foto-2.jpg",
  "https://example.com/foto-3.jpg",
]

function listing(overrides: Partial<Imovel> = {}): Imovel {
  return {
    id: "listing-1",
    titulo: "Casa teste",
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
    imageUrl: imageUrls[0],
    imageUrls,
    imageStorageKeys: null,
    imageCoverIndex: null,
    imageVisualAnalysis: null,
    imageIngestionStatus: null,
    imageIngestionError: null,
    starred: false,
    visited: false,
    strikethrough: false,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

describe("PropertyImageGallery", () => {
  it("renders the first image as selected by default", () => {
    render(<PropertyImageGallery listing={listing()} />)

    expect(
      screen.getByRole("button", { name: "Abrir imagem 1" })
    ).toBeInTheDocument()
    expect(screen.getByAltText("Foto 1 do imóvel")).toHaveAttribute(
      "src",
      imageUrls[0]
    )
    expect(
      screen.getByRole("button", { name: "Selecionar imagem 1" })
    ).toHaveAttribute("aria-current", "true")
  })

  it("changes the selected image when a thumbnail is clicked", () => {
    render(<PropertyImageGallery listing={listing()} />)

    fireEvent.click(screen.getByRole("button", { name: "Selecionar imagem 2" }))

    expect(
      screen.getByRole("button", { name: "Abrir imagem 2" })
    ).toBeInTheDocument()
    expect(screen.getByAltText("Foto 2 do imóvel")).toHaveAttribute(
      "src",
      imageUrls[1]
    )
    expect(
      screen.getByRole("button", { name: "Selecionar imagem 2" })
    ).toHaveAttribute("aria-current", "true")
  })

  it("opens the lightbox at the selected image", () => {
    render(<PropertyImageGallery listing={listing()} />)

    fireEvent.click(screen.getByRole("button", { name: "Selecionar imagem 3" }))
    fireEvent.click(screen.getByRole("button", { name: "Abrir imagem 3" }))

    const dialog = screen.getByRole("dialog")

    expect(
      within(dialog).getByRole("button", { name: "Anterior" })
    ).toBeInTheDocument()
    expect(dialog.querySelector("img")).toHaveAttribute("src", imageUrls[2])
  })

  it("uses the cover image as the initial selected image", () => {
    render(<PropertyImageGallery listing={listing({ imageCoverIndex: 2 })} />)

    expect(
      screen.getByRole("button", { name: "Abrir imagem 3" })
    ).toBeInTheDocument()
    expect(screen.getByAltText("Foto 3 do imóvel")).toHaveAttribute(
      "src",
      imageUrls[2]
    )
    expect(
      screen.getByRole("button", { name: "Selecionar imagem 3" })
    ).toHaveAttribute("aria-current", "true")
  })

  it("orders thumbnails by visual analysis while preserving original image labels", () => {
    render(
      <PropertyImageGallery
        listing={listing({
          imageCoverIndex: 2,
          imageVisualAnalysis: {
            schemaVersion: 1,
            engine: "test",
            generatedAt: "2026-01-01T00:00:00Z",
            order: [2, 0, 1],
            features: [],
          },
        })}
      />
    )

    const thumbnailLabels = screen
      .getAllByRole("button", { name: /Selecionar imagem/ })
      .map((button) => button.getAttribute("aria-label"))

    expect(thumbnailLabels).toEqual([
      "Selecionar imagem 3",
      "Selecionar imagem 1",
      "Selecionar imagem 2",
    ])
    expect(
      screen.getByRole("button", { name: "Selecionar imagem 3" })
    ).toHaveAttribute("aria-current", "true")
  })

  it("falls back to the original order when visual analysis order is invalid", () => {
    render(
      <PropertyImageGallery
        listing={listing({
          imageVisualAnalysis: {
            schemaVersion: 1,
            engine: "test",
            generatedAt: "2026-01-01T00:00:00Z",
            order: [2, 0],
            features: [],
          },
        })}
      />
    )

    const thumbnailLabels = screen
      .getAllByRole("button", { name: /Selecionar imagem/ })
      .map((button) => button.getAttribute("aria-label"))

    expect(thumbnailLabels).toEqual([
      "Selecionar imagem 1",
      "Selecionar imagem 2",
      "Selecionar imagem 3",
    ])
  })

  it("navigates the lightbox by visual order", () => {
    render(
      <PropertyImageGallery
        listing={listing({
          imageCoverIndex: 2,
          imageVisualAnalysis: {
            schemaVersion: 1,
            engine: "test",
            generatedAt: "2026-01-01T00:00:00Z",
            order: [2, 0, 1],
            features: [],
          },
        })}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Abrir imagem 3" }))
    fireEvent.click(screen.getByRole("button", { name: "Próxima" }))

    const dialog = screen.getByRole("dialog")

    expect(dialog.querySelector("img")).toHaveAttribute("src", imageUrls[0])
  })
})
