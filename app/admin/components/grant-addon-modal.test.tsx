import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { GrantAddonModal } from "./grant-addon-modal"

// Store original fetch
const originalFetch = global.fetch

// Mock data
const mockUsers = [
  { id: "user-1", name: "Alice", email: "alice@example.com" },
  { id: "user-2", name: "Bob", email: "bob@example.com" },
  { id: "user-3", name: "Charlie", email: "charlie@example.com" },
]

const mockOrganizations = [
  { id: "org-1", name: "Acme Inc", slug: "acme" },
  { id: "org-2", name: "Beta Corp", slug: "beta" },
]

const mockAddons = [
  {
    id: "addon-1",
    name: "Risco de Enchente",
    slug: "flood",
    description: "Análise de risco de enchente",
  },
  {
    id: "addon-2",
    name: "Análise de Ruído",
    slug: "noise",
    description: "Análise de níveis de ruído",
  },
]

describe("GrantAddonModal", () => {
  const mockOnClose = vi.fn()
  const mockOnGranted = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, "alert").mockImplementation(() => {})
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it("does not render when isOpen is false", () => {
    render(
      <GrantAddonModal
        users={mockUsers}
        organizations={mockOrganizations}
        availableAddons={mockAddons}
        isOpen={false}
        onClose={mockOnClose}
        onGranted={mockOnGranted}
      />
    )

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("renders when isOpen is true", () => {
    render(
      <GrantAddonModal
        users={mockUsers}
        organizations={mockOrganizations}
        availableAddons={mockAddons}
        isOpen={true}
        onClose={mockOnClose}
        onGranted={mockOnGranted}
      />
    )

    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText("Conceder Addon")).toBeInTheDocument()
    expect(
      screen.getByText("Conceda um addon para um usuário ou organização")
    ).toBeInTheDocument()
  })

  it("has target type selector with user and organization options", () => {
    render(
      <GrantAddonModal
        users={mockUsers}
        organizations={mockOrganizations}
        availableAddons={mockAddons}
        isOpen={true}
        onClose={mockOnClose}
        onGranted={mockOnGranted}
      />
    )

    expect(screen.getByLabelText("Tipo de Destino")).toBeInTheDocument()
    // Default should be user
    expect(screen.getByText("Buscar Usuário")).toBeInTheDocument()
  })

  it("switches to organization mode when organization is selected", async () => {
    render(
      <GrantAddonModal
        users={mockUsers}
        organizations={mockOrganizations}
        availableAddons={mockAddons}
        isOpen={true}
        onClose={mockOnClose}
        onGranted={mockOnGranted}
      />
    )

    // Click the target type select trigger
    const targetTypeSelect = screen.getByLabelText("Selecione o tipo de destino")
    fireEvent.click(targetTypeSelect)

    // Select organization
    const orgOption = screen.getByRole("option", { name: "Organização" })
    fireEvent.click(orgOption)

    await waitFor(() => {
      expect(screen.getByText("Buscar Organização")).toBeInTheDocument()
    })
  })

  it("filters users based on search query", async () => {
    render(
      <GrantAddonModal
        users={mockUsers}
        organizations={mockOrganizations}
        availableAddons={mockAddons}
        isOpen={true}
        onClose={mockOnClose}
        onGranted={mockOnGranted}
      />
    )

    const searchInput = screen.getByPlaceholderText("Buscar por nome ou email...")
    fireEvent.change(searchInput, { target: { value: "alice" } })

    // Open entity selector
    const entitySelect = screen.getByLabelText("Selecione o usuário")
    fireEvent.click(entitySelect)

    await waitFor(() => {
      expect(screen.getByText(/Alice/)).toBeInTheDocument()
      expect(screen.queryByText(/Bob/)).not.toBeInTheDocument()
    })
  })

  it("filters organizations based on search query", async () => {
    render(
      <GrantAddonModal
        users={mockUsers}
        organizations={mockOrganizations}
        availableAddons={mockAddons}
        isOpen={true}
        onClose={mockOnClose}
        onGranted={mockOnGranted}
      />
    )

    // Switch to organization mode
    const targetTypeSelect = screen.getByLabelText("Selecione o tipo de destino")
    fireEvent.click(targetTypeSelect)
    fireEvent.click(screen.getByRole("option", { name: "Organização" }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Buscar por nome ou slug...")).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText("Buscar por nome ou slug...")
    fireEvent.change(searchInput, { target: { value: "acme" } })

    // Open entity selector
    const entitySelect = screen.getByLabelText("Selecione a organização")
    fireEvent.click(entitySelect)

    await waitFor(() => {
      expect(screen.getByText(/Acme Inc/)).toBeInTheDocument()
      expect(screen.queryByText(/Beta Corp/)).not.toBeInTheDocument()
    })
  })

  it("shows addon selector with available addons", async () => {
    render(
      <GrantAddonModal
        users={mockUsers}
        organizations={mockOrganizations}
        availableAddons={mockAddons}
        isOpen={true}
        onClose={mockOnClose}
        onGranted={mockOnGranted}
      />
    )

    const addonSelect = screen.getByLabelText("Selecione o addon")
    fireEvent.click(addonSelect)

    await waitFor(() => {
      expect(screen.getByText("Risco de Enchente")).toBeInTheDocument()
      expect(screen.getByText("Análise de Ruído")).toBeInTheDocument()
    })
  })

  it("has an optional expiration date field", () => {
    render(
      <GrantAddonModal
        users={mockUsers}
        organizations={mockOrganizations}
        availableAddons={mockAddons}
        isOpen={true}
        onClose={mockOnClose}
        onGranted={mockOnGranted}
      />
    )

    expect(screen.getByLabelText("Data de Expiração (opcional)")).toBeInTheDocument()
    expect(
      screen.getByText("Deixe vazio para concessão sem expiração.")
    ).toBeInTheDocument()
  })

  it("disables grant button when no entity is selected", () => {
    render(
      <GrantAddonModal
        users={mockUsers}
        organizations={mockOrganizations}
        availableAddons={mockAddons}
        isOpen={true}
        onClose={mockOnClose}
        onGranted={mockOnGranted}
      />
    )

    const grantButton = screen.getByRole("button", { name: "Conceder" })
    expect(grantButton).toBeDisabled()
  })

  it("disables grant button when no addon is selected", async () => {
    render(
      <GrantAddonModal
        users={mockUsers}
        organizations={mockOrganizations}
        availableAddons={mockAddons}
        isOpen={true}
        onClose={mockOnClose}
        onGranted={mockOnGranted}
      />
    )

    // Select a user
    const entitySelect = screen.getByLabelText("Selecione o usuário")
    fireEvent.click(entitySelect)
    fireEvent.click(screen.getByText(/Alice/))

    await waitFor(() => {
      const grantButton = screen.getByRole("button", { name: "Conceder" })
      expect(grantButton).toBeDisabled()
    })
  })

  it("enables grant button when both entity and addon are selected", async () => {
    render(
      <GrantAddonModal
        users={mockUsers}
        organizations={mockOrganizations}
        availableAddons={mockAddons}
        isOpen={true}
        onClose={mockOnClose}
        onGranted={mockOnGranted}
      />
    )

    // Select a user
    const entitySelect = screen.getByLabelText("Selecione o usuário")
    fireEvent.click(entitySelect)
    fireEvent.click(screen.getByText(/Alice/))

    // Select an addon
    await waitFor(() => {
      expect(screen.getByLabelText("Selecione o addon")).toBeInTheDocument()
    })
    const addonSelect = screen.getByLabelText("Selecione o addon")
    fireEvent.click(addonSelect)
    fireEvent.click(screen.getByText("Risco de Enchente"))

    await waitFor(() => {
      const grantButton = screen.getByRole("button", { name: "Conceder" })
      expect(grantButton).not.toBeDisabled()
    })
  })

  it("calls onClose when cancel button is clicked", () => {
    render(
      <GrantAddonModal
        users={mockUsers}
        organizations={mockOrganizations}
        availableAddons={mockAddons}
        isOpen={true}
        onClose={mockOnClose}
        onGranted={mockOnGranted}
      />
    )

    const cancelButton = screen.getByRole("button", { name: "Cancelar" })
    fireEvent.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it("grants addon to user successfully", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    } as Response)

    render(
      <GrantAddonModal
        users={mockUsers}
        organizations={mockOrganizations}
        availableAddons={mockAddons}
        isOpen={true}
        onClose={mockOnClose}
        onGranted={mockOnGranted}
      />
    )

    // Select a user
    const entitySelect = screen.getByLabelText("Selecione o usuário")
    fireEvent.click(entitySelect)
    fireEvent.click(screen.getByText(/Alice/))

    // Select an addon
    await waitFor(() => {
      expect(screen.getByLabelText("Selecione o addon")).toBeInTheDocument()
    })
    const addonSelect = screen.getByLabelText("Selecione o addon")
    fireEvent.click(addonSelect)
    fireEvent.click(screen.getByText("Risco de Enchente"))

    // Click grant
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Conceder" })).not.toBeDisabled()
    })
    fireEvent.click(screen.getByRole("button", { name: "Conceder" }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/users/user-1/addons",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.stringContaining("flood"),
        })
      )
    })

    await waitFor(() => {
      expect(mockOnGranted).toHaveBeenCalled()
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it("grants addon to organization successfully", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    } as Response)

    render(
      <GrantAddonModal
        users={mockUsers}
        organizations={mockOrganizations}
        availableAddons={mockAddons}
        isOpen={true}
        onClose={mockOnClose}
        onGranted={mockOnGranted}
      />
    )

    // Switch to organization mode
    const targetTypeSelect = screen.getByLabelText("Selecione o tipo de destino")
    fireEvent.click(targetTypeSelect)
    fireEvent.click(screen.getByRole("option", { name: "Organização" }))

    // Select an organization
    await waitFor(() => {
      expect(screen.getByLabelText("Selecione a organização")).toBeInTheDocument()
    })
    const entitySelect = screen.getByLabelText("Selecione a organização")
    fireEvent.click(entitySelect)
    fireEvent.click(screen.getByText(/Acme Inc/))

    // Select an addon
    await waitFor(() => {
      expect(screen.getByLabelText("Selecione o addon")).toBeInTheDocument()
    })
    const addonSelect = screen.getByLabelText("Selecione o addon")
    fireEvent.click(addonSelect)
    fireEvent.click(screen.getByText("Risco de Enchente"))

    // Click grant
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Conceder" })).not.toBeDisabled()
    })
    fireEvent.click(screen.getByRole("button", { name: "Conceder" }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/organizations/org-1/addons",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.stringContaining("flood"),
        })
      )
    })

    await waitFor(() => {
      expect(mockOnGranted).toHaveBeenCalled()
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it("includes expiration date in request when provided", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    } as Response)

    render(
      <GrantAddonModal
        users={mockUsers}
        organizations={mockOrganizations}
        availableAddons={mockAddons}
        isOpen={true}
        onClose={mockOnClose}
        onGranted={mockOnGranted}
      />
    )

    // Select a user
    const entitySelect = screen.getByLabelText("Selecione o usuário")
    fireEvent.click(entitySelect)
    fireEvent.click(screen.getByText(/Alice/))

    // Select an addon
    await waitFor(() => {
      expect(screen.getByLabelText("Selecione o addon")).toBeInTheDocument()
    })
    const addonSelect = screen.getByLabelText("Selecione o addon")
    fireEvent.click(addonSelect)
    fireEvent.click(screen.getByText("Risco de Enchente"))

    // Set expiration date
    const expiresAtInput = screen.getByLabelText("Data de Expiração (opcional)")
    fireEvent.change(expiresAtInput, { target: { value: "2025-12-31" } })

    // Click grant
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Conceder" })).not.toBeDisabled()
    })
    fireEvent.click(screen.getByRole("button", { name: "Conceder" }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/users/user-1/addons",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("expiresAt"),
        })
      )
    })
  })

  it("shows error alert when grant fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Addon already granted" }),
    } as Response)

    render(
      <GrantAddonModal
        users={mockUsers}
        organizations={mockOrganizations}
        availableAddons={mockAddons}
        isOpen={true}
        onClose={mockOnClose}
        onGranted={mockOnGranted}
      />
    )

    // Select a user
    const entitySelect = screen.getByLabelText("Selecione o usuário")
    fireEvent.click(entitySelect)
    fireEvent.click(screen.getByText(/Alice/))

    // Select an addon
    await waitFor(() => {
      expect(screen.getByLabelText("Selecione o addon")).toBeInTheDocument()
    })
    const addonSelect = screen.getByLabelText("Selecione o addon")
    fireEvent.click(addonSelect)
    fireEvent.click(screen.getByText("Risco de Enchente"))

    // Click grant
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Conceder" })).not.toBeDisabled()
    })
    fireEvent.click(screen.getByRole("button", { name: "Conceder" }))

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Addon already granted")
    })

    // Modal should still be open
    expect(mockOnClose).not.toHaveBeenCalled()
    expect(mockOnGranted).not.toHaveBeenCalled()
  })

  it("shows loading state while granting", async () => {
    let resolveGrant: (value: Response) => void
    global.fetch = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGrant = resolve
        })
    )

    render(
      <GrantAddonModal
        users={mockUsers}
        organizations={mockOrganizations}
        availableAddons={mockAddons}
        isOpen={true}
        onClose={mockOnClose}
        onGranted={mockOnGranted}
      />
    )

    // Select a user
    const entitySelect = screen.getByLabelText("Selecione o usuário")
    fireEvent.click(entitySelect)
    fireEvent.click(screen.getByText(/Alice/))

    // Select an addon
    await waitFor(() => {
      expect(screen.getByLabelText("Selecione o addon")).toBeInTheDocument()
    })
    const addonSelect = screen.getByLabelText("Selecione o addon")
    fireEvent.click(addonSelect)
    fireEvent.click(screen.getByText("Risco de Enchente"))

    // Click grant
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Conceder" })).not.toBeDisabled()
    })
    fireEvent.click(screen.getByRole("button", { name: "Conceder" }))

    await waitFor(() => {
      expect(screen.getByText("Concedendo...")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled()
    })

    // Resolve the promise
    resolveGrant!({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    } as Response)
  })

  it("shows empty state when no users available", () => {
    render(
      <GrantAddonModal
        users={[]}
        organizations={mockOrganizations}
        availableAddons={mockAddons}
        isOpen={true}
        onClose={mockOnClose}
        onGranted={mockOnGranted}
      />
    )

    const entitySelect = screen.getByLabelText("Selecione o usuário")
    fireEvent.click(entitySelect)

    expect(screen.getByText("Nenhum usuário encontrado")).toBeInTheDocument()
  })

  it("shows empty state when no organizations available", async () => {
    render(
      <GrantAddonModal
        users={mockUsers}
        organizations={[]}
        availableAddons={mockAddons}
        isOpen={true}
        onClose={mockOnClose}
        onGranted={mockOnGranted}
      />
    )

    // Switch to organization mode
    const targetTypeSelect = screen.getByLabelText("Selecione o tipo de destino")
    fireEvent.click(targetTypeSelect)
    fireEvent.click(screen.getByRole("option", { name: "Organização" }))

    await waitFor(() => {
      expect(screen.getByLabelText("Selecione a organização")).toBeInTheDocument()
    })
    const entitySelect = screen.getByLabelText("Selecione a organização")
    fireEvent.click(entitySelect)

    expect(screen.getByText("Nenhuma organização encontrada")).toBeInTheDocument()
  })

  it("shows empty state when no addons available", () => {
    render(
      <GrantAddonModal
        users={mockUsers}
        organizations={mockOrganizations}
        availableAddons={[]}
        isOpen={true}
        onClose={mockOnClose}
        onGranted={mockOnGranted}
      />
    )

    const addonSelect = screen.getByLabelText("Selecione o addon")
    fireEvent.click(addonSelect)

    expect(screen.getByText("Nenhum addon disponível")).toBeInTheDocument()
  })

  it("clears entity selection when target type changes", async () => {
    render(
      <GrantAddonModal
        users={mockUsers}
        organizations={mockOrganizations}
        availableAddons={mockAddons}
        isOpen={true}
        onClose={mockOnClose}
        onGranted={mockOnGranted}
      />
    )

    // Select a user
    const entitySelect = screen.getByLabelText("Selecione o usuário")
    fireEvent.click(entitySelect)
    fireEvent.click(screen.getByText(/Alice/))

    // Verify selection is shown
    await waitFor(() => {
      expect(screen.getByText(/Selecionado: Alice/)).toBeInTheDocument()
    })

    // Switch to organization mode
    const targetTypeSelect = screen.getByLabelText("Selecione o tipo de destino")
    fireEvent.click(targetTypeSelect)
    fireEvent.click(screen.getByRole("option", { name: "Organização" }))

    // Selection should be cleared
    await waitFor(() => {
      expect(screen.queryByText(/Selecionado:/)).not.toBeInTheDocument()
    })
  })

  it("shows addon description when addon is selected", async () => {
    render(
      <GrantAddonModal
        users={mockUsers}
        organizations={mockOrganizations}
        availableAddons={mockAddons}
        isOpen={true}
        onClose={mockOnClose}
        onGranted={mockOnGranted}
      />
    )

    const addonSelect = screen.getByLabelText("Selecione o addon")
    fireEvent.click(addonSelect)
    fireEvent.click(screen.getByText("Risco de Enchente"))

    await waitFor(() => {
      expect(screen.getByText("Análise de risco de enchente")).toBeInTheDocument()
    })
  })
})
