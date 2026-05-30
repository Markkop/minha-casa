"use client"

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
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
    imageCategories: null,
    imageIngestionStatus: null,
    imageIngestionError: null,
    starred: false,
    visited: false,
    strikethrough: false,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

function renderGallery(overrides: Partial<Imovel> = {}) {
  const updateListing = vi.fn().mockResolvedValue(listing(overrides))
  render(<PropertyImageGallery listing={listing(overrides)} updateListing={updateListing} />)
  return { updateListing }
}

describe("PropertyImageGallery", () => {
  it("renders the first image as selected by default", () => {
    renderGallery()

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
    expect(
      screen.getByRole("button", { name: "Imagem 1 é a capa" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("combobox", { name: "Categoria da imagem 1" })
    ).toHaveValue("none")
  })

  it("changes the selected image when a thumbnail is clicked", () => {
    renderGallery()

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
    renderGallery()

    fireEvent.click(screen.getByRole("button", { name: "Selecionar imagem 3" }))
    fireEvent.click(screen.getByRole("button", { name: "Abrir imagem 3" }))

    const dialog = screen.getByRole("dialog")

    expect(
      within(dialog).getByRole("button", { name: "Anterior" })
    ).toBeInTheDocument()
    expect(dialog.querySelector("img")).toHaveAttribute("src", imageUrls[2])
  })

  it("uses the cover image as the initial selected image", () => {
    renderGallery({ imageCoverIndex: 2 })

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

  it("persists the selected image as cover", async () => {
    const { updateListing } = renderGallery()

    fireEvent.click(screen.getByRole("button", { name: "Selecionar imagem 2" }))
    fireEvent.click(screen.getByRole("button", { name: "Definir imagem 2 como capa" }))

    await waitFor(() => {
      expect(updateListing).toHaveBeenCalledWith("listing-1", {
        imageCoverIndex: 1,
      })
    })
  })

  it("persists the selected image category", async () => {
    const { updateListing } = renderGallery()

    fireEvent.click(screen.getByRole("button", { name: "Selecionar imagem 2" }))
    fireEvent.change(screen.getByRole("combobox", { name: "Categoria da imagem 2" }), {
      target: { value: "quarto-2" },
    })

    await waitFor(() => {
      expect(updateListing).toHaveBeenCalledWith("listing-1", {
        imageCategories: { "1": "quarto-2" },
      })
    })
  })

  it("removes the selected image category", async () => {
    const { updateListing } = renderGallery({ imageCategories: { "1": "quarto-2" } })

    fireEvent.click(screen.getByRole("button", { name: "Selecionar imagem 2" }))
    fireEvent.change(screen.getByRole("combobox", { name: "Categoria da imagem 2" }), {
      target: { value: "none" },
    })

    await waitFor(() => {
      expect(updateListing).toHaveBeenCalledWith("listing-1", {
        imageCategories: null,
      })
    })
  })

  it("orders thumbnails by cover and manual categories while preserving original image labels", () => {
    renderGallery({
      imageCoverIndex: 2,
      imageCategories: {
        "0": "banheiro-1",
        "1": "quarto-1",
      },
    })

    const thumbnailLabels = screen
      .getAllByRole("button", { name: /Selecionar imagem/ })
      .map((button) => button.getAttribute("aria-label"))

    expect(thumbnailLabels).toEqual([
      "Selecionar imagem 3",
      "Selecionar imagem 2",
      "Selecionar imagem 1",
    ])
    expect(
      screen.getByRole("button", { name: "Selecionar imagem 3" })
    ).toHaveAttribute("aria-current", "true")
  })

  it("places uncategorized images after categorized images", () => {
    renderGallery({
      imageCategories: {
        "2": "sala",
      },
    })

    const thumbnailLabels = screen
      .getAllByRole("button", { name: /Selecionar imagem/ })
      .map((button) => button.getAttribute("aria-label"))

    expect(thumbnailLabels).toEqual([
      "Selecionar imagem 1",
      "Selecionar imagem 3",
      "Selecionar imagem 2",
    ])
  })

  it("navigates the lightbox by manual order", () => {
    renderGallery({
      imageCoverIndex: 2,
      imageCategories: {
        "0": "banheiro-1",
        "1": "quarto-1",
      },
    })

    fireEvent.click(screen.getByRole("button", { name: "Abrir imagem 3" }))
    fireEvent.click(screen.getByRole("button", { name: "Próxima" }))

    const dialog = screen.getByRole("dialog")

    expect(dialog.querySelector("img")).toHaveAttribute("src", imageUrls[1])
  })
})
