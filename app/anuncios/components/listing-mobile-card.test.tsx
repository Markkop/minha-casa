"use client"

import type { ReactNode } from "react"
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ListingMobileCard } from "./listing-mobile-card"
import type { Imovel } from "../lib/api"
import { DEFAULT_PROPERTY_DISPLAY } from "@/app/anuncios/lib/listings-display-prefs"
import { mobileCompactListingDisplayTitle } from "@/lib/listing-display-title"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: ReactNode
    href: string
  }) => <a href={href}>{children}</a>,
}))

vi.mock("./use-listing-row-interactions", () => ({
  useListingRowInteractions: () => ({
    tipoImovelPopoverOpen: false,
    setTipoImovelPopoverOpen: vi.fn(),
    contactPopoverOpen: false,
    setContactPopoverOpen: vi.fn(),
    contactNameInput: "",
    setContactNameInput: vi.fn(),
    contactNumberInput: "",
    setContactNumberInput: vi.fn(),
    contactSelectorOpen: false,
    setContactSelectorOpen: vi.fn(),
    quickReparsePopoverOpen: false,
    setQuickReparsePopoverOpen: vi.fn(),
    quickReparseInput: "",
    setQuickReparseInput: vi.fn(),
    quickReparseLoading: false,
    quickReparseError: null,
    setQuickReparseError: vi.fn(),
    copyToCollectionPopoverOpen: false,
    setCopyToCollectionPopoverOpen: vi.fn(),
    copiedMarkdown: false,
    handleToggleStar: vi.fn(),
    handleChangeListingStatus: vi.fn(),
    handleTogglePiscina: vi.fn(),
    handleTogglePiscinaTermica: vi.fn(),
    handleTogglePorteiro24h: vi.fn(),
    handleToggleAcademia: vi.fn(),
    handleToggleVistaLivre: vi.fn(),
    handleCycleAndar: vi.fn(),
    handleCycleGaragem: vi.fn(),
    handleCycleQuartos: vi.fn(),
    handleCycleBanheiros: vi.fn(),
    handleSetTipoImovel: vi.fn(),
    openContactPopover: vi.fn(),
    handleSelectExistingContact: vi.fn(),
    handleSaveContact: vi.fn(),
    openQuickReparsePopover: vi.fn(),
    runQuickReparse: vi.fn(),
    handleCopyListingMarkdown: vi.fn(),
    handleDelete: vi.fn(),
    handleCopyToCollection: vi.fn(),
  }),
}))

const defaultVisibleColumns = {
  image: true,
  property: true,
  status: true,
  price: true,
  area: true,
  value: true,
  rooms: false,
  bathrooms: false,
  dates: false,
} as const

function listing(overrides: Partial<Imovel> = {}): Imovel {
  return {
    id: "listing-1",
    titulo: "Apartamento no Centro",
    endereco: "Rua das Flores, 100",
    link: "https://example.com/listing",
    preco: 850000,
    m2Totais: 120,
    m2Privado: 95,
    quartos: 3,
    banheiros: 2,
    suites: 1,
    garagem: 2,
    andar: 5,
    tipoImovel: "apartamento",
    starred: false,
    strikethrough: false,
    listingStatus: "analisando",
    visited: false,
    createdAt: "2026-01-01T00:00:00Z",
    addedAt: "2026-01-15",
    ...overrides,
  } as Imovel
}

const fullDisplayTitle =
  "Apartamento com 3 quartos em Itacorubi · Rua das Flores · R$ 850 mil"

describe("ListingMobileCard", () => {
  it("renders backdrop layout with left aside and image overlays", () => {
    render(
      <ListingMobileCard
        imovel={listing()}
        visibleColumns={defaultVisibleColumns}
        imageColumnView="image"
        enabledMetricVariants={new Set(["total", "privado"])}
        propertyDisplay={DEFAULT_PROPERTY_DISPLAY}
        activeMetricVariant={null}
        uniqueContacts={[]}
        hasOtherCollections={false}
        collections={[]}
        activeCollectionId="col-1"
        updateListing={vi.fn()}
        removeListing={vi.fn()}
        openImageModal={vi.fn()}
        openEditListing={vi.fn()}
        onQuickReparseRequest={vi.fn()}
        onQuickReparseDetected={vi.fn()}
        displayTitle={fullDisplayTitle}
      />
    )

    expect(screen.queryByTestId("listing-mobile-top")).not.toBeInTheDocument()
    expect(screen.queryByTestId("listing-mobile-bottom")).not.toBeInTheDocument()

    const card = screen.getByTestId("listing-mobile-card-listing-1")
    const backdrop = within(card).getByTestId("listing-mobile-backdrop")
    const body = screen.getByTestId("listing-mobile-body")
    const aside = within(body).getByTestId("listing-mobile-aside")

    expect(within(aside).getByTestId("listing-mobile-status-row")).toBeInTheDocument()
    expect(within(aside).getByTestId("listing-status-select")).toBeInTheDocument()

    const propertyRow = within(aside).getByTestId("listing-mobile-property-row")
    expect(within(propertyRow).getByTestId("listing-property-icons")).toBeInTheDocument()

    expect(within(aside).queryByTestId("listing-star-button")).not.toBeInTheDocument()
    expect(within(aside).getByTestId("listing-mobile-price")).toBeInTheDocument()
    expect(within(aside).getByTestId("listing-mobile-metrics-total")).toHaveTextContent(
      "120 m²"
    )
    expect(within(aside).getByTestId("listing-mobile-metrics-privado")).toHaveTextContent(
      "95 m²"
    )
    expect(within(aside).getByTestId("listing-mobile-actions-row")).toBeInTheDocument()
    expect(within(aside).getByTestId("listing-row-action-buttons")).toBeInTheDocument()

    const overlayTop = within(backdrop).getByTestId("listing-mobile-overlay-top")
    expect(within(overlayTop).getByTestId("listing-star-button")).toBeInTheDocument()
    const overlayTitle = mobileCompactListingDisplayTitle(fullDisplayTitle)
    expect(within(overlayTop).getByRole("link", { name: overlayTitle })).toBeInTheDocument()
    expect(within(overlayTop).getByLabelText("Abrir anúncio original")).toHaveAttribute(
      "href",
      "https://example.com/listing"
    )
    expect(within(backdrop).queryByTestId("listing-status-select")).not.toBeInTheDocument()
    expect(within(overlayTop).queryByTestId("listing-row-action-buttons")).not.toBeInTheDocument()

    const overlayBottom = within(backdrop).getByTestId("listing-mobile-overlay-bottom")
    expect(within(overlayBottom).getByTestId("listing-mobile-address")).toHaveTextContent(
      "Rua das Flores, 100"
    )
  })
})
