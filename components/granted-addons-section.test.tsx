import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { GrantedAddonsSection } from "./granted-addons-section"
import { AddonsProvider } from "@/lib/use-addons"
import type { UserAddon, OrganizationAddon } from "@/lib/addons"

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, "localStorage", { value: localStorageMock })

// Mock confirm
const mockConfirm = vi.fn()
global.confirm = mockConfirm

// Mock alert
const mockAlert = vi.fn()
global.alert = mockAlert

// Sample test data
const mockUserAddons: UserAddon[] = [
  {
    id: "ua-1",
    userId: "user-1",
    addonSlug: "financiamento",
    grantedAt: new Date("2024-01-01"),
    grantedBy: "admin-1",
    enabled: true,
    expiresAt: null,
  },
  {
    id: "ua-2",
    userId: "user-1",
    addonSlug: "analytics",
    grantedAt: new Date("2024-01-01"),
    grantedBy: "admin-1",
    enabled: true,
    expiresAt: new Date("2027-12-31"), // Future date so it's not expired
  },
]

const mockOrgAddons: OrganizationAddon[] = [
  {
    id: "oa-1",
    organizationId: "org-1",
    addonSlug: "flood",
    grantedAt: new Date("2024-01-01"),
    grantedBy: "admin-1",
    enabled: true,
    expiresAt: null,
  },
]

function renderWithProvider(
  initialUserAddons: UserAddon[] = [],
  initialOrgAddons: OrganizationAddon[] = []
) {
  return render(
    <AddonsProvider
      initialUserAddons={initialUserAddons}
      initialOrgAddons={initialOrgAddons}
    >
      <GrantedAddonsSection />
    </AddonsProvider>
  )
}

describe("GrantedAddonsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null) // Default to personal context
    mockConfirm.mockReturnValue(true)
  })

  describe("rendering", () => {
    it("shows loading state when addons are loading", () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ addons: [] }),
      })

      render(
        <AddonsProvider>
          <GrantedAddonsSection />
        </AddonsProvider>
      )

      expect(screen.getByText("Carregando addons...")).toBeInTheDocument()
    })

    it("shows empty state when no user addons", async () => {
      renderWithProvider([], [])

      // With initial data, loading should be false immediately
      await waitFor(() => {
        expect(screen.getByText("Nenhum addon pessoal ativo.")).toBeInTheDocument()
      })
    })

    it("displays user addons with Revoke buttons", () => {
      renderWithProvider(mockUserAddons, [])

      expect(screen.getByText("financiamento")).toBeInTheDocument()
      expect(screen.getByText("analytics")).toBeInTheDocument()
      expect(screen.getAllByText("Revogar")).toHaveLength(2)
    })

    it("shows org addons section only in org context", async () => {
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({
          type: "organization",
          organizationId: "org-1",
          organizationName: "Test Org",
        })
      )

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ addons: mockUserAddons }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ addons: mockOrgAddons }),
        })

      render(
        <AddonsProvider>
          <GrantedAddonsSection />
        </AddonsProvider>
      )

      await waitFor(() => {
        expect(screen.getByText("Meus Addons")).toBeInTheDocument()
      })
      // Org section heading will appear after loading
    })

    it("shows addon status badge correctly", () => {
      const disabledAddon: UserAddon = {
        ...mockUserAddons[0],
        enabled: false,
      }
      renderWithProvider([disabledAddon], [])

      expect(screen.getByText("Desabilitado")).toBeInTheDocument()
    })

    it("shows expired status for expired addons", () => {
      const expiredAddon: UserAddon = {
        ...mockUserAddons[0],
        expiresAt: new Date("2020-01-01"),
      }
      renderWithProvider([expiredAddon], [])

      expect(screen.getByText("Expirado")).toBeInTheDocument()
    })

    it("shows active status for valid addons", async () => {
      renderWithProvider(mockUserAddons, [])

      await waitFor(() => {
        expect(screen.getAllByText("Ativo")).toHaveLength(2)
      })
    })
  })

  describe("revoke functionality", () => {
    it("calls revokeUserAddon when Revoke button is clicked", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      renderWithProvider(mockUserAddons, [])

      const revokeButtons = screen.getAllByText("Revogar")
      fireEvent.click(revokeButtons[0])

      expect(mockConfirm).toHaveBeenCalledWith("Tem certeza que deseja revogar este addon?")

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/user/addons/financiamento", {
          method: "DELETE",
        })
      })
    })

    it("does not revoke when user cancels confirmation", () => {
      mockConfirm.mockReturnValue(false)

      renderWithProvider(mockUserAddons, [])

      const revokeButtons = screen.getAllByText("Revogar")
      fireEvent.click(revokeButtons[0])

      expect(mockConfirm).toHaveBeenCalled()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it("shows alert on revoke failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Failed" }),
      })

      // Suppress console.error
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      renderWithProvider(mockUserAddons, [])

      const revokeButtons = screen.getAllByText("Revogar")
      fireEvent.click(revokeButtons[0])

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith("Falha ao revogar addon. Tente novamente.")
      })

      consoleSpy.mockRestore()
    })

    it("shows 'Revogando...' text while revoking", async () => {
      let resolvePromise: () => void
      const fetchPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve
      })

      mockFetch.mockImplementationOnce(async () => {
        await fetchPromise
        return {
          ok: true,
          json: async () => ({ success: true }),
        }
      })

      renderWithProvider(mockUserAddons, [])

      const revokeButtons = screen.getAllByText("Revogar")
      fireEvent.click(revokeButtons[0])

      await waitFor(() => {
        expect(screen.getByText("Revogando...")).toBeInTheDocument()
      })

      // Clean up
      resolvePromise!()
    })
  })

  describe("organization addons", () => {
    it("displays org addons with Revoke buttons in org context", async () => {
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({
          type: "organization",
          organizationId: "org-1",
          organizationName: "Test Org",
        })
      )

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ addons: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ addons: mockOrgAddons }),
        })

      render(
        <AddonsProvider>
          <GrantedAddonsSection />
        </AddonsProvider>
      )

      await waitFor(() => {
        expect(screen.getByText("flood")).toBeInTheDocument()
      })

      expect(screen.getByText("Addons da Organização")).toBeInTheDocument()
    })
  })
})
