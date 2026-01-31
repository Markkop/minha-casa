import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { UserAddonsSettings } from "./user-addons-settings"
import { AddonsProvider } from "@/lib/use-addons"
import type { UserAddon } from "@/lib/addons"

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
    addonSlug: "flood",
    grantedAt: new Date("2024-01-01"),
    grantedBy: "admin-1",
    enabled: true,
    expiresAt: new Date("2027-12-31"),
  },
]

function renderWithProvider(initialUserAddons: UserAddon[] = []) {
  return render(
    <AddonsProvider initialUserAddons={initialUserAddons}>
      <UserAddonsSettings />
    </AddonsProvider>
  )
}

describe("UserAddonsSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  describe("rendering", () => {
    it("shows loading state when addons are loading", () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ addons: [] }),
      })

      render(
        <AddonsProvider>
          <UserAddonsSettings />
        </AddonsProvider>
      )

      expect(screen.getByText("Carregando addons...")).toBeInTheDocument()
    })

    it("shows empty state when no user addons", async () => {
      renderWithProvider([])

      await waitFor(() => {
        expect(
          screen.getByText("Você não possui nenhum addon ativo no momento.")
        ).toBeInTheDocument()
      })
    })

    it("displays user addons with display names", () => {
      renderWithProvider(mockUserAddons)

      expect(
        screen.getByText("Simulador de Financiamento")
      ).toBeInTheDocument()
      expect(screen.getByText("Risco de Enchente")).toBeInTheDocument()
    })

    it("displays addon descriptions", () => {
      renderWithProvider(mockUserAddons)

      expect(
        screen.getByText(
          "Simule financiamentos imobiliários e veja suas parcelas"
        )
      ).toBeInTheDocument()
      expect(
        screen.getByText("Análise de risco de enchente com visualização 3D")
      ).toBeInTheDocument()
    })

    it("shows toggle switches for each addon", () => {
      renderWithProvider(mockUserAddons)

      const switches = screen.getAllByRole("switch")
      expect(switches).toHaveLength(2)
    })

    it("shows active status for enabled addons", () => {
      renderWithProvider(mockUserAddons)

      expect(screen.getAllByText("Ativo")).toHaveLength(2)
    })

    it("shows disabled status for disabled addons", () => {
      const disabledAddon: UserAddon = {
        ...mockUserAddons[0],
        enabled: false,
      }
      renderWithProvider([disabledAddon])

      expect(screen.getByText("Desabilitado")).toBeInTheDocument()
    })

    it("shows expired status for expired addons", () => {
      const expiredAddon: UserAddon = {
        ...mockUserAddons[0],
        expiresAt: new Date("2020-01-01"),
      }
      renderWithProvider([expiredAddon])

      expect(screen.getByText("Expirado")).toBeInTheDocument()
      expect(screen.getByText("(expirado)")).toBeInTheDocument()
    })

    it("disables toggle switch for expired addons", () => {
      const expiredAddon: UserAddon = {
        ...mockUserAddons[0],
        expiresAt: new Date("2020-01-01"),
      }
      renderWithProvider([expiredAddon])

      const switchElement = screen.getByRole("switch")
      expect(switchElement).toBeDisabled()
    })

    it("displays granted date", () => {
      renderWithProvider(mockUserAddons)

      expect(screen.getAllByText(/Concedido em:/)).toHaveLength(2)
    })

    it("displays expiration date when present", () => {
      renderWithProvider(mockUserAddons)

      expect(screen.getByText(/Expira em:/)).toBeInTheDocument()
    })

    it("shows card header with title and description", () => {
      renderWithProvider(mockUserAddons)

      expect(screen.getByText("Meus Addons")).toBeInTheDocument()
      expect(
        screen.getByText(
          "Gerencie seus addons pessoais. Ative ou desative funcionalidades extras."
        )
      ).toBeInTheDocument()
    })
  })

  describe("toggle functionality", () => {
    it("calls API to toggle addon when switch is clicked", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, addon: { enabled: false } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ addons: mockUserAddons }),
        })

      renderWithProvider(mockUserAddons)

      const switches = screen.getAllByRole("switch")
      fireEvent.click(switches[0])

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/user/addons/financiamento", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ enabled: false }),
        })
      })
    })

    it("refreshes addons after successful toggle", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, addon: { enabled: false } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ addons: [] }),
        })

      renderWithProvider(mockUserAddons)

      const switches = screen.getAllByRole("switch")
      fireEvent.click(switches[0])

      await waitFor(() => {
        // Second call should be to refresh addons
        expect(mockFetch).toHaveBeenCalledWith("/api/user/addons")
      })
    })

    it("shows error message when toggle fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Falha ao atualizar addon" }),
      })

      // Suppress console.error
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      renderWithProvider(mockUserAddons)

      const switches = screen.getAllByRole("switch")
      fireEvent.click(switches[0])

      await waitFor(() => {
        expect(
          screen.getByText("Falha ao atualizar addon")
        ).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })

    it("disables switch while toggling", async () => {
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

      renderWithProvider(mockUserAddons)

      const switches = screen.getAllByRole("switch")
      fireEvent.click(switches[0])

      await waitFor(() => {
        expect(switches[0]).toBeDisabled()
      })

      // Clean up
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ addons: mockUserAddons }),
      })
      resolvePromise!()
    })

    it("toggles addon from disabled to enabled", async () => {
      const disabledAddon: UserAddon = {
        ...mockUserAddons[0],
        enabled: false,
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, addon: { enabled: true } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ addons: [{ ...disabledAddon, enabled: true }] }),
        })

      renderWithProvider([disabledAddon])

      const switchElement = screen.getByRole("switch")
      fireEvent.click(switchElement)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/user/addons/financiamento", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ enabled: true }),
        })
      })
    })
  })

  describe("accessibility", () => {
    it("has accessible labels for toggle switches", () => {
      renderWithProvider(mockUserAddons)

      expect(
        screen.getByLabelText("Desativar Simulador de Financiamento")
      ).toBeInTheDocument()
      expect(
        screen.getByLabelText("Desativar Risco de Enchente")
      ).toBeInTheDocument()
    })

    it("has correct aria-label for disabled addon toggle", () => {
      const disabledAddon: UserAddon = {
        ...mockUserAddons[0],
        enabled: false,
      }
      renderWithProvider([disabledAddon])

      expect(
        screen.getByLabelText("Ativar Simulador de Financiamento")
      ).toBeInTheDocument()
    })
  })

  describe("unknown addon slugs", () => {
    it("displays slug as fallback name for unknown addons", () => {
      const unknownAddon: UserAddon = {
        id: "ua-3",
        userId: "user-1",
        addonSlug: "unknown-addon",
        grantedAt: new Date("2024-01-01"),
        grantedBy: "admin-1",
        enabled: true,
        expiresAt: null,
      }
      renderWithProvider([unknownAddon])

      expect(screen.getByText("unknown-addon")).toBeInTheDocument()
    })
  })
})
