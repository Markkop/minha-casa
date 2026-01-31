import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { OrgAddonsTable } from "./org-addons-table"

// Store original fetch
const originalFetch = global.fetch

describe("OrgAddonsTable", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  const mockOrganizations = [
    {
      id: "org-1",
      name: "Test Org 1",
      slug: "test-org-1",
      createdAt: "2025-01-01T00:00:00Z",
      owner: {
        id: "user-1",
        name: "John Doe",
        email: "john@example.com",
      },
      addons: [
        {
          addonSlug: "flood",
          addonName: "Risco de Enchente",
          enabled: true,
          expiresAt: null,
          grantedAt: "2025-01-01T00:00:00Z",
          grantedBy: "admin-1",
        },
      ],
    },
    {
      id: "org-2",
      name: "Test Org 2",
      slug: "test-org-2",
      createdAt: "2025-01-02T00:00:00Z",
      owner: {
        id: "user-2",
        name: "Jane Smith",
        email: "jane@example.com",
      },
      addons: [],
    },
  ]

  const mockAvailableAddons = [
    {
      id: "addon-1",
      name: "Risco de Enchente",
      slug: "flood",
      description: "Análise de risco de enchente",
    },
    {
      id: "addon-2",
      name: "Financiamento",
      slug: "financiamento",
      description: "Simulador de financiamento",
    },
  ]

  it("shows loading state initially", () => {
    global.fetch = vi.fn(() => new Promise(() => {})) as typeof fetch

    render(<OrgAddonsTable />)

    expect(screen.getByText(/carregando organizações/i)).toBeInTheDocument()
  })

  it("shows error state and retry button when fetch fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error")) as typeof fetch

    render(<OrgAddonsTable />)

    await waitFor(() => {
      expect(screen.getByText(/tentar novamente/i)).toBeInTheDocument()
    })
  })

  it("displays organizations with addon status", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            organizations: mockOrganizations,
            availableAddons: mockAvailableAddons,
          }),
      } as Response)
    ) as typeof fetch

    render(<OrgAddonsTable />)

    await waitFor(() => {
      expect(screen.getByText("Test Org 1")).toBeInTheDocument()
      expect(screen.getByText("Test Org 2")).toBeInTheDocument()
    })

    // Check owner info is displayed
    expect(screen.getByText("John Doe")).toBeInTheDocument()
    expect(screen.getByText("john@example.com")).toBeInTheDocument()

    // Check addon headers
    expect(screen.getByText("Risco de Enchente")).toBeInTheDocument()
    expect(screen.getByText("Financiamento")).toBeInTheDocument()
  })

  it("shows active status for enabled addons", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            organizations: mockOrganizations,
            availableAddons: mockAvailableAddons,
          }),
      } as Response)
    ) as typeof fetch

    render(<OrgAddonsTable />)

    await waitFor(() => {
      expect(screen.getByText("Test Org 1")).toBeInTheDocument()
    })

    // The first org has the flood addon active
    const ativoElements = screen.getAllByText("Ativo")
    expect(ativoElements.length).toBeGreaterThan(0)
  })

  it("shows no status for organizations without addons", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            organizations: mockOrganizations,
            availableAddons: mockAvailableAddons,
          }),
      } as Response)
    ) as typeof fetch

    render(<OrgAddonsTable />)

    await waitFor(() => {
      expect(screen.getByText("Test Org 2")).toBeInTheDocument()
    })

    // Org 2 has no addons, so it should have "-" placeholders
    const dashElements = screen.getAllByText("-")
    expect(dashElements.length).toBeGreaterThan(0)
  })

  it("filters organizations by search query", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            organizations: mockOrganizations,
            availableAddons: mockAvailableAddons,
          }),
      } as Response)
    ) as typeof fetch

    render(<OrgAddonsTable />)

    await waitFor(() => {
      expect(screen.getByText("Test Org 1")).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/buscar/i)
    fireEvent.change(searchInput, { target: { value: "jane" } })

    // Only Test Org 2 should be visible (Jane is the owner)
    expect(screen.queryByText("Test Org 1")).not.toBeInTheDocument()
    expect(screen.getByText("Test Org 2")).toBeInTheDocument()
  })

  it("opens grant modal when clicking grant button", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            organizations: mockOrganizations,
            availableAddons: mockAvailableAddons,
          }),
      } as Response)
    ) as typeof fetch

    render(<OrgAddonsTable />)

    await waitFor(() => {
      expect(screen.getByText("Test Org 1")).toBeInTheDocument()
    })

    const grantButtons = screen.getAllByText("Conceder Addon")
    fireEvent.click(grantButtons[0])

    // Modal should be open
    expect(screen.getByText(/conceder addon para test org 1/i)).toBeInTheDocument()
  })

  it("closes grant modal when clicking cancel", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            organizations: mockOrganizations,
            availableAddons: mockAvailableAddons,
          }),
      } as Response)
    ) as typeof fetch

    render(<OrgAddonsTable />)

    await waitFor(() => {
      expect(screen.getByText("Test Org 1")).toBeInTheDocument()
    })

    const grantButtons = screen.getAllByText("Conceder Addon")
    fireEvent.click(grantButtons[0])

    // Modal should be open
    expect(screen.getByText(/conceder addon para test org 1/i)).toBeInTheDocument()

    // Click cancel
    const cancelButton = screen.getByRole("button", { name: /cancelar/i })
    fireEvent.click(cancelButton)

    // Modal should be closed
    expect(screen.queryByText(/conceder addon para test org 1/i)).not.toBeInTheDocument()
  })

  it("shows message when no organizations exist", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            organizations: [],
            availableAddons: mockAvailableAddons,
          }),
      } as Response)
    ) as typeof fetch

    render(<OrgAddonsTable />)

    await waitFor(() => {
      expect(screen.getByText(/nenhuma organização encontrada/i)).toBeInTheDocument()
    })
  })

  it("shows message when no addons are registered", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            organizations: mockOrganizations,
            availableAddons: [],
          }),
      } as Response)
    ) as typeof fetch

    render(<OrgAddonsTable />)

    await waitFor(() => {
      expect(screen.getByText(/nenhum addon cadastrado no sistema/i)).toBeInTheDocument()
    })
  })

  it("shows expired status for expired addons", async () => {
    const expiredOrg = {
      ...mockOrganizations[0],
      addons: [
        {
          addonSlug: "flood",
          addonName: "Risco de Enchente",
          enabled: true,
          expiresAt: "2020-01-01T00:00:00Z", // Past date
          grantedAt: "2019-01-01T00:00:00Z",
          grantedBy: "admin-1",
        },
      ],
    }

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            organizations: [expiredOrg],
            availableAddons: mockAvailableAddons,
          }),
      } as Response)
    ) as typeof fetch

    render(<OrgAddonsTable />)

    await waitFor(() => {
      expect(screen.getByText("Test Org 1")).toBeInTheDocument()
    })

    expect(screen.getByText("Expirado")).toBeInTheDocument()
  })

  it("shows disabled status for disabled addons", async () => {
    const disabledOrg = {
      ...mockOrganizations[0],
      addons: [
        {
          addonSlug: "flood",
          addonName: "Risco de Enchente",
          enabled: false,
          expiresAt: null,
          grantedAt: "2025-01-01T00:00:00Z",
          grantedBy: "admin-1",
        },
      ],
    }

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            organizations: [disabledOrg],
            availableAddons: mockAvailableAddons,
          }),
      } as Response)
    ) as typeof fetch

    render(<OrgAddonsTable />)

    await waitFor(() => {
      expect(screen.getByText("Test Org 1")).toBeInTheDocument()
    })

    expect(screen.getByText("Desabilitado")).toBeInTheDocument()
  })

  it("passes onDataChange prop to the component", async () => {
    const onDataChange = vi.fn()

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            organizations: mockOrganizations,
            availableAddons: mockAvailableAddons,
          }),
      } as Response)
    ) as typeof fetch

    render(<OrgAddonsTable onDataChange={onDataChange} />)

    await waitFor(() => {
      expect(screen.getByText("Test Org 1")).toBeInTheDocument()
    })

    // Verify the component renders correctly with the callback prop
    expect(screen.getByText("Addons por Organização")).toBeInTheDocument()
  })

  it("shows revoke button for granted addons", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            organizations: mockOrganizations,
            availableAddons: mockAvailableAddons,
          }),
      } as Response)
    ) as typeof fetch

    render(<OrgAddonsTable />)

    await waitFor(() => {
      expect(screen.getByText("Test Org 1")).toBeInTheDocument()
    })

    // Should have a revoke button for the flood addon on org 1
    const revokeButtons = screen.getAllByText("Revogar")
    expect(revokeButtons.length).toBeGreaterThan(0)
  })
})
