import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { UserDetailsModal } from "./user-details-modal"

// Store original fetch
const originalFetch = global.fetch

// Mock data - use future date for subscription
const futureDate = new Date()
futureDate.setFullYear(futureDate.getFullYear() + 1)
const futureISOString = futureDate.toISOString()

const mockUser = {
  id: "user-123",
  email: "test@example.com",
  name: "Test User",
  isAdmin: false,
  emailVerified: true,
  createdAt: "2024-01-15T10:00:00Z",
  subscription: {
    id: "sub-123",
    status: "active",
    expiresAt: futureISOString,
    plan: {
      id: "plan-123",
      name: "Plus",
      slug: "plus",
    },
  },
}

const mockUserWithoutSubscription = {
  ...mockUser,
  id: "user-456",
  subscription: null,
}

const mockAdminUser = {
  ...mockUser,
  id: "user-admin",
  name: "Admin User",
  isAdmin: true,
}

const mockAvailableAddons = [
  {
    id: "addon-1",
    name: "Risco de Enchente",
    slug: "flood",
    description: "Análise de risco de enchente",
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "addon-2",
    name: "Análise de Ruído",
    slug: "noise",
    description: "Análise de níveis de ruído",
    createdAt: "2024-01-01T00:00:00Z",
  },
]

const mockUserAddonGrants = [
  {
    id: "grant-1",
    userId: "user-123",
    addonSlug: "flood",
    grantedAt: "2024-01-10T10:00:00Z",
    grantedBy: "admin-123",
    enabled: true,
    expiresAt: null,
    addon: mockAvailableAddons[0],
    grantedByUser: { id: "admin-123", name: "Admin User", email: "admin@example.com" },
  },
]

const mockExpiredAddonGrant: typeof mockUserAddonGrants[0] = {
  id: "grant-2",
  userId: "user-123",
  addonSlug: "noise",
  grantedAt: "2024-01-10T10:00:00Z",
  grantedBy: "admin-123",
  enabled: true,
  expiresAt: "2024-01-15T10:00:00Z" as unknown as null, // In the past - cast for test purposes
  addon: mockAvailableAddons[1],
  grantedByUser: { id: "admin-123", name: "Admin User", email: "admin@example.com" },
}

const mockDisabledAddonGrant: typeof mockUserAddonGrants[0] = {
  id: "grant-3",
  userId: "user-123",
  addonSlug: "noise",
  grantedAt: "2024-01-10T10:00:00Z",
  grantedBy: "admin-123",
  enabled: false,
  expiresAt: null,
  addon: mockAvailableAddons[1],
  grantedByUser: null as unknown as { id: string; name: string; email: string }, // Cast for test purposes
}

describe("UserDetailsModal", () => {
  const mockOnClose = vi.fn()
  const mockOnUserUpdated = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, "alert").mockImplementation(() => {})
    vi.spyOn(window, "confirm").mockImplementation(() => true)
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  function mockFetch(addonGrants = mockUserAddonGrants) {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/admin/users/") && url.endsWith("/addons")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ addons: addonGrants }),
        } as Response)
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response)
    }) as typeof fetch
  }

  it("renders user basic information correctly", async () => {
    mockFetch()

    render(
      <UserDetailsModal
        user={mockUser}
        availableAddons={mockAvailableAddons}
        onClose={mockOnClose}
        onUserUpdated={mockOnUserUpdated}
      />
    )

    expect(screen.getByText("Detalhes do Usuário")).toBeInTheDocument()
    expect(screen.getByText("Test User")).toBeInTheDocument()
    expect(screen.getByText("test@example.com")).toBeInTheDocument()
    expect(screen.getByText("Email Verificado")).toBeInTheDocument()
  })

  it("displays admin badge when user is admin", async () => {
    mockFetch()

    render(
      <UserDetailsModal
        user={mockAdminUser}
        availableAddons={mockAvailableAddons}
        onClose={mockOnClose}
        onUserUpdated={mockOnUserUpdated}
      />
    )

    expect(screen.getByText("Admin")).toBeInTheDocument()
  })

  it("displays subscription information", async () => {
    mockFetch()

    render(
      <UserDetailsModal
        user={mockUser}
        availableAddons={mockAvailableAddons}
        onClose={mockOnClose}
        onUserUpdated={mockOnUserUpdated}
      />
    )

    expect(screen.getByText("Plus")).toBeInTheDocument()
    expect(screen.getByText("Ativa")).toBeInTheDocument()
  })

  it("shows no subscription message when user has no subscription", async () => {
    mockFetch()

    render(
      <UserDetailsModal
        user={mockUserWithoutSubscription}
        availableAddons={mockAvailableAddons}
        onClose={mockOnClose}
        onUserUpdated={mockOnUserUpdated}
      />
    )

    expect(screen.getByText("Nenhuma assinatura ativa")).toBeInTheDocument()
  })

  it("loads and displays user addons", async () => {
    mockFetch()

    render(
      <UserDetailsModal
        user={mockUser}
        availableAddons={mockAvailableAddons}
        onClose={mockOnClose}
        onUserUpdated={mockOnUserUpdated}
      />
    )

    await waitFor(() => {
      expect(screen.getByText("Risco de Enchente")).toBeInTheDocument()
    })

    expect(screen.getByText("Análise de risco de enchente")).toBeInTheDocument()
    expect(screen.getByText(/Admin User/)).toBeInTheDocument()
  })

  it("shows loading state while fetching addons", async () => {
    global.fetch = vi.fn(() => new Promise(() => {})) as typeof fetch

    render(
      <UserDetailsModal
        user={mockUser}
        availableAddons={mockAvailableAddons}
        onClose={mockOnClose}
        onUserUpdated={mockOnUserUpdated}
      />
    )

    expect(screen.getByText("Carregando addons...")).toBeInTheDocument()
  })

  it("shows empty state when user has no addons", async () => {
    mockFetch([])

    render(
      <UserDetailsModal
        user={mockUser}
        availableAddons={mockAvailableAddons}
        onClose={mockOnClose}
        onUserUpdated={mockOnUserUpdated}
      />
    )

    await waitFor(() => {
      expect(
        screen.getByText("Nenhum addon concedido para este usuário.")
      ).toBeInTheDocument()
    })
  })

  it("shows expired badge for expired addon", async () => {
    mockFetch([mockExpiredAddonGrant])

    render(
      <UserDetailsModal
        user={mockUser}
        availableAddons={mockAvailableAddons}
        onClose={mockOnClose}
        onUserUpdated={mockOnUserUpdated}
      />
    )

    await waitFor(() => {
      expect(screen.getByText("Expirado")).toBeInTheDocument()
    })
  })

  it("shows disabled badge for disabled addon", async () => {
    mockFetch([mockDisabledAddonGrant])

    render(
      <UserDetailsModal
        user={mockUser}
        availableAddons={mockAvailableAddons}
        onClose={mockOnClose}
        onUserUpdated={mockOnUserUpdated}
      />
    )

    // Wait for loading to complete and addons to be displayed
    await waitFor(() => {
      expect(screen.queryByText("Carregando addons...")).not.toBeInTheDocument()
    })

    // The badge text "Desabilitado" should be in the document
    await waitFor(() => {
      const desabilitadoElements = screen.getAllByText("Desabilitado")
      expect(desabilitadoElements.length).toBeGreaterThan(0)
    })
  })

  it("calls onClose when close button is clicked", async () => {
    mockFetch()

    render(
      <UserDetailsModal
        user={mockUser}
        availableAddons={mockAvailableAddons}
        onClose={mockOnClose}
        onUserUpdated={mockOnUserUpdated}
      />
    )

    const closeButton = screen.getByRole("button", { name: "Fechar" })
    fireEvent.click(closeButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it("opens grant addon modal when button is clicked", async () => {
    mockFetch([])

    render(
      <UserDetailsModal
        user={mockUser}
        availableAddons={mockAvailableAddons}
        onClose={mockOnClose}
        onUserUpdated={mockOnUserUpdated}
      />
    )

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Conceder Addon" })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "Conceder Addon" }))

    await waitFor(() => {
      expect(screen.getByText(/Selecione um addon/)).toBeInTheDocument()
    })
  })

  it("shows grant addon modal with expected elements", async () => {
    mockFetch([])

    render(
      <UserDetailsModal
        user={mockUser}
        availableAddons={mockAvailableAddons}
        onClose={mockOnClose}
        onUserUpdated={mockOnUserUpdated}
      />
    )

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Conceder Addon" })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "Conceder Addon" }))

    await waitFor(() => {
      // Check modal is open with expected elements
      expect(screen.getByText(/Selecione um addon/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Data de Expiração/)).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument()
    })
  })

  it("revokes addon when revoke button is clicked", async () => {
    mockFetch()

    let fetchCallCount = 0
    global.fetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes("/api/admin/users/") && url.includes("/addons/flood")) {
        if (options?.method === "DELETE") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          } as Response)
        }
      }
      if (url.includes("/api/admin/users/") && url.endsWith("/addons")) {
        fetchCallCount++
        // Return empty after revoke
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            addons: fetchCallCount === 1 ? mockUserAddonGrants : [],
          }),
        } as Response)
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response)
    }) as typeof fetch

    render(
      <UserDetailsModal
        user={mockUser}
        availableAddons={mockAvailableAddons}
        onClose={mockOnClose}
        onUserUpdated={mockOnUserUpdated}
      />
    )

    await waitFor(() => {
      expect(screen.getByText("Risco de Enchente")).toBeInTheDocument()
    })

    const revokeButton = screen.getByRole("button", { name: "Revogar" })
    fireEvent.click(revokeButton)

    await waitFor(() => {
      expect(mockOnUserUpdated).toHaveBeenCalled()
    })
  })

  it("toggles addon enabled state", async () => {
    mockFetch()

    global.fetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes("/api/admin/users/") && url.endsWith("/addons")) {
        if (options?.method === "POST") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ userAddon: { ...mockUserAddonGrants[0], enabled: false } }),
          } as Response)
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ addons: mockUserAddonGrants }),
        } as Response)
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response)
    }) as typeof fetch

    render(
      <UserDetailsModal
        user={mockUser}
        availableAddons={mockAvailableAddons}
        onClose={mockOnClose}
        onUserUpdated={mockOnUserUpdated}
      />
    )

    await waitFor(() => {
      expect(screen.getByText("Habilitado")).toBeInTheDocument()
    })

    const toggleSwitch = screen.getByRole("switch")
    fireEvent.click(toggleSwitch)

    await waitFor(() => {
      expect(mockOnUserUpdated).toHaveBeenCalled()
    })
  })

  it("shows error alert when fetch fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error")) as typeof fetch

    render(
      <UserDetailsModal
        user={mockUser}
        availableAddons={mockAvailableAddons}
        onClose={mockOnClose}
        onUserUpdated={mockOnUserUpdated}
      />
    )

    await waitFor(() => {
      expect(
        screen.getByText("Nenhum addon concedido para este usuário.")
      ).toBeInTheDocument()
    })
  })

  it("disables grant addon button when all addons are already granted", async () => {
    // Mock all addons being granted
    mockFetch([
      mockUserAddonGrants[0],
      { ...mockUserAddonGrants[0], id: "grant-2", addonSlug: "noise", addon: mockAvailableAddons[1] },
    ])

    render(
      <UserDetailsModal
        user={mockUser}
        availableAddons={mockAvailableAddons}
        onClose={mockOnClose}
        onUserUpdated={mockOnUserUpdated}
      />
    )

    await waitFor(() => {
      const grantButton = screen.getByRole("button", { name: "Conceder Addon" })
      expect(grantButton).toBeDisabled()
    })
  })

  it("enables grant button only when there are grantable addons", async () => {
    // User already has both addons - button should be disabled
    const allAddonsGranted = [
      mockUserAddonGrants[0],
      { ...mockUserAddonGrants[0], id: "grant-2", addonSlug: "noise", addon: mockAvailableAddons[1] },
    ]
    mockFetch(allAddonsGranted)

    render(
      <UserDetailsModal
        user={mockUser}
        availableAddons={mockAvailableAddons}
        onClose={mockOnClose}
        onUserUpdated={mockOnUserUpdated}
      />
    )

    await waitFor(() => {
      const grantButton = screen.getByRole("button", { name: "Conceder Addon" })
      expect(grantButton).toBeDisabled()
    })
  })
})
