"use client"

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { LinksClient } from "./links/links-client"
import { ContactsClient } from "./contatos/contacts-client"
import { RegionsClient } from "./regioes/regions-client"
import { CondominiumsClient } from "./condominios/condominiums-client"

const workspaceMocks = vi.hoisted(() => ({
  fetchSavedLinks: vi.fn(),
  deleteSavedLink: vi.fn(),
  createSavedLink: vi.fn(),
  updateSavedLink: vi.fn(),
  enrichSavedLink: vi.fn(),
  fetchContacts: vi.fn(),
  saveContact: vi.fn(),
  deleteContact: vi.fn(),
  fetchRegions: vi.fn(),
  saveRegion: vi.fn(),
  deleteRegion: vi.fn(),
  fetchCondominiums: vi.fn(),
  saveCondominium: vi.fn(),
  deleteCondominium: vi.fn(),
}))

vi.mock("@/lib/workspace/use-workspace-profile", () => ({
  useWorkspaceProfile: () => ({ orgId: null, profileLabel: "Perfil pessoal" }),
}))

vi.mock("@/lib/workspace/client", () => workspaceMocks)

beforeEach(() => {
  for (const mock of Object.values(workspaceMocks)) {
    mock.mockReset()
  }
})

afterEach(() => {
  cleanup()
})

describe("workspace tables local row updates", () => {
  it("removes a saved link locally after delete without reloading the table", async () => {
    workspaceMocks.fetchSavedLinks.mockResolvedValue({
      links: [
        {
          id: "link-1",
          userId: "user-1",
          orgId: null,
          title: "Busca salva",
          url: "https://example.com",
          description: "Descrição",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ],
    })
    workspaceMocks.deleteSavedLink.mockResolvedValue({ success: true })

    render(<LinksClient />)

    expect(await screen.findByText("Busca salva")).toBeInTheDocument()
    fireEvent.click(screen.getByTitle("Excluir"))

    await waitFor(() => {
      expect(screen.queryByText("Busca salva")).not.toBeInTheDocument()
    })
    expect(workspaceMocks.fetchSavedLinks).toHaveBeenCalledTimes(1)
  })

  it("removes a contact locally after delete without reloading the table", async () => {
    workspaceMocks.fetchContacts.mockResolvedValue({
      contacts: [
        {
          id: "contact-1",
          userId: "user-1",
          orgId: null,
          name: "João Corretor",
          phone: "48999990000",
          normalizedPhone: "48999990000",
          email: null,
          notes: null,
          source: "manual",
          listings: [],
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ],
    })
    workspaceMocks.deleteContact.mockResolvedValue({ success: true })

    render(<ContactsClient />)

    expect(await screen.findByText("João Corretor")).toBeInTheDocument()
    fireEvent.click(screen.getByTitle("Excluir"))

    await waitFor(() => {
      expect(screen.queryByText("João Corretor")).not.toBeInTheDocument()
    })
    expect(workspaceMocks.fetchContacts).toHaveBeenCalledTimes(1)
  })

  it("removes a region locally after delete without reloading the table", async () => {
    workspaceMocks.fetchRegions.mockResolvedValue({
      regions: [
        {
          id: "region-1",
          userId: "user-1",
          orgId: null,
          city: "Florianópolis",
          neighborhood: "Campeche",
          propertyType: "casa",
          pricePerM2: 10000,
          notes: null,
          listingCount: 2,
          favoriteAveragePricePerM2: 11000,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ],
    })
    workspaceMocks.deleteRegion.mockResolvedValue({ success: true })

    render(<RegionsClient />)

    expect(await screen.findByText("Campeche")).toBeInTheDocument()
    fireEvent.click(screen.getByTitle("Excluir"))

    await waitFor(() => {
      expect(screen.queryByText("Campeche")).not.toBeInTheDocument()
    })
    expect(workspaceMocks.fetchRegions).toHaveBeenCalledTimes(1)
  })

  it("removes a condominium locally after delete without reloading the table", async () => {
    workspaceMocks.fetchCondominiums.mockResolvedValue({
      condominiums: [
        {
          id: "condo-1",
          userId: "user-1",
          orgId: null,
          name: "Residencial Mar",
          city: "Florianópolis",
          neighborhood: "Campeche",
          address: "Rua A",
          propertyType: "apartamento",
          amenities: ["Piscina"],
          notes: null,
          source: "manual",
          listingCount: 1,
          listings: [],
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ],
    })
    workspaceMocks.deleteCondominium.mockResolvedValue({ success: true })

    render(<CondominiumsClient />)

    expect(await screen.findByText("Residencial Mar")).toBeInTheDocument()
    fireEvent.click(screen.getByTitle("Excluir"))

    await waitFor(() => {
      expect(screen.queryByText("Residencial Mar")).not.toBeInTheDocument()
    })
    expect(workspaceMocks.fetchCondominiums).toHaveBeenCalledTimes(1)
  })
})
