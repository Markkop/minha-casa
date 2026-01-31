import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { OrgAddonsSettings } from "./org-addons-settings"
import type { OrganizationAddon } from "@/lib/addons"

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Sample test data
const mockOrgAddons: OrganizationAddon[] = [
  {
    id: "oa-1",
    organizationId: "org-1",
    addonSlug: "financiamento",
    grantedAt: new Date("2024-01-01"),
    grantedBy: "admin-1",
    enabled: true,
    expiresAt: null,
  },
  {
    id: "oa-2",
    organizationId: "org-1",
    addonSlug: "flood",
    grantedAt: new Date("2024-01-01"),
    grantedBy: "admin-1",
    enabled: true,
    expiresAt: new Date("2027-12-31"),
  },
]

const defaultProps = {
  organizationId: "org-1",
  organizationName: "Minha Empresa",
  userRole: "owner" as const,
}

describe("OrgAddonsSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("rendering", () => {
    it("shows loading state when fetching addons", () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ addons: [] }),
      })

      render(<OrgAddonsSettings {...defaultProps} />)

      expect(screen.getByText("Carregando addons...")).toBeInTheDocument()
    })

    it("shows empty state when no org addons", () => {
      render(<OrgAddonsSettings {...defaultProps} initialAddons={[]} />)

      expect(
        screen.getByText(
          "Esta organização não possui nenhum addon ativo no momento."
        )
      ).toBeInTheDocument()
    })

    it("displays org addons with display names", () => {
      render(
        <OrgAddonsSettings {...defaultProps} initialAddons={mockOrgAddons} />
      )

      expect(
        screen.getByText("Simulador de Financiamento")
      ).toBeInTheDocument()
      expect(screen.getByText("Risco de Enchente")).toBeInTheDocument()
    })

    it("displays addon descriptions", () => {
      render(
        <OrgAddonsSettings {...defaultProps} initialAddons={mockOrgAddons} />
      )

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
      render(
        <OrgAddonsSettings {...defaultProps} initialAddons={mockOrgAddons} />
      )

      const switches = screen.getAllByRole("switch")
      expect(switches).toHaveLength(2)
    })

    it("shows active status for enabled addons", () => {
      render(
        <OrgAddonsSettings {...defaultProps} initialAddons={mockOrgAddons} />
      )

      expect(screen.getAllByText("Ativo")).toHaveLength(2)
    })

    it("shows disabled status for disabled addons", () => {
      const disabledAddon: OrganizationAddon = {
        ...mockOrgAddons[0],
        enabled: false,
      }
      render(
        <OrgAddonsSettings {...defaultProps} initialAddons={[disabledAddon]} />
      )

      expect(screen.getByText("Desabilitado")).toBeInTheDocument()
    })

    it("shows expired status for expired addons", () => {
      const expiredAddon: OrganizationAddon = {
        ...mockOrgAddons[0],
        expiresAt: new Date("2020-01-01"),
      }
      render(
        <OrgAddonsSettings {...defaultProps} initialAddons={[expiredAddon]} />
      )

      expect(screen.getByText("Expirado")).toBeInTheDocument()
      expect(screen.getByText("(expirado)")).toBeInTheDocument()
    })

    it("disables toggle switch for expired addons", () => {
      const expiredAddon: OrganizationAddon = {
        ...mockOrgAddons[0],
        expiresAt: new Date("2020-01-01"),
      }
      render(
        <OrgAddonsSettings {...defaultProps} initialAddons={[expiredAddon]} />
      )

      const switchElement = screen.getByRole("switch")
      expect(switchElement).toBeDisabled()
    })

    it("displays granted date", () => {
      render(
        <OrgAddonsSettings {...defaultProps} initialAddons={mockOrgAddons} />
      )

      expect(screen.getAllByText(/Concedido em:/)).toHaveLength(2)
    })

    it("displays expiration date when present", () => {
      render(
        <OrgAddonsSettings {...defaultProps} initialAddons={mockOrgAddons} />
      )

      expect(screen.getByText(/Expira em:/)).toBeInTheDocument()
    })

    it("shows card header with organization name for owners", () => {
      render(
        <OrgAddonsSettings {...defaultProps} initialAddons={mockOrgAddons} />
      )

      expect(screen.getByText("Addons da Organização")).toBeInTheDocument()
      expect(
        screen.getByText(/Gerencie os addons de Minha Empresa/)
      ).toBeInTheDocument()
    })

    it("shows read-only message for members", () => {
      render(
        <OrgAddonsSettings
          {...defaultProps}
          userRole="member"
          initialAddons={mockOrgAddons}
        />
      )

      expect(
        screen.getByText(/Apenas administradores podem gerenciar/)
      ).toBeInTheDocument()
      expect(
        screen.getByText("Apenas donos e administradores podem alterar os addons.")
      ).toBeInTheDocument()
    })
  })

  describe("toggle functionality for owners/admins", () => {
    it("calls API to toggle addon when switch is clicked by owner", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          addon: { enabled: false },
        }),
      })

      render(
        <OrgAddonsSettings {...defaultProps} initialAddons={mockOrgAddons} />
      )

      const switches = screen.getAllByRole("switch")
      fireEvent.click(switches[0])

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/organizations/org-1/addons/financiamento",
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ enabled: false }),
          }
        )
      })
    })

    it("calls API to toggle addon when switch is clicked by admin", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          addon: { enabled: false },
        }),
      })

      render(
        <OrgAddonsSettings
          {...defaultProps}
          userRole="admin"
          initialAddons={mockOrgAddons}
        />
      )

      const switches = screen.getAllByRole("switch")
      fireEvent.click(switches[0])

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/organizations/org-1/addons/financiamento",
          expect.any(Object)
        )
      })
    })

    it("updates local state after successful toggle", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          addon: { enabled: false },
        }),
      })

      render(
        <OrgAddonsSettings {...defaultProps} initialAddons={mockOrgAddons} />
      )

      // Initially has 2 active addons
      expect(screen.getAllByText("Ativo")).toHaveLength(2)

      const switches = screen.getAllByRole("switch")
      fireEvent.click(switches[0])

      await waitFor(() => {
        expect(screen.getByText("Desabilitado")).toBeInTheDocument()
      })
    })

    it("shows error message when toggle fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Falha ao atualizar addon" }),
      })

      // Suppress console.error
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      render(
        <OrgAddonsSettings {...defaultProps} initialAddons={mockOrgAddons} />
      )

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

      render(
        <OrgAddonsSettings {...defaultProps} initialAddons={mockOrgAddons} />
      )

      const switches = screen.getAllByRole("switch")
      fireEvent.click(switches[0])

      await waitFor(() => {
        expect(switches[0]).toBeDisabled()
      })

      // Clean up
      resolvePromise!()
    })

    it("toggles addon from disabled to enabled", async () => {
      const disabledAddon: OrganizationAddon = {
        ...mockOrgAddons[0],
        enabled: false,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          addon: { enabled: true },
        }),
      })

      render(
        <OrgAddonsSettings {...defaultProps} initialAddons={[disabledAddon]} />
      )

      const switchElement = screen.getByRole("switch")
      fireEvent.click(switchElement)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/organizations/org-1/addons/financiamento",
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ enabled: true }),
          }
        )
      })
    })
  })

  describe("permissions for members", () => {
    it("disables toggle switches for members", () => {
      render(
        <OrgAddonsSettings
          {...defaultProps}
          userRole="member"
          initialAddons={mockOrgAddons}
        />
      )

      const switches = screen.getAllByRole("switch")
      switches.forEach((switchElement) => {
        expect(switchElement).toBeDisabled()
      })
    })

    it("does not call API when member clicks switch", async () => {
      render(
        <OrgAddonsSettings
          {...defaultProps}
          userRole="member"
          initialAddons={mockOrgAddons}
        />
      )

      const switches = screen.getAllByRole("switch")
      fireEvent.click(switches[0])

      // Wait a bit to ensure no API call was made
      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe("accessibility", () => {
    it("has accessible labels for toggle switches", () => {
      render(
        <OrgAddonsSettings {...defaultProps} initialAddons={mockOrgAddons} />
      )

      expect(
        screen.getByLabelText("Desativar Simulador de Financiamento")
      ).toBeInTheDocument()
      expect(
        screen.getByLabelText("Desativar Risco de Enchente")
      ).toBeInTheDocument()
    })

    it("has correct aria-label for disabled addon toggle", () => {
      const disabledAddon: OrganizationAddon = {
        ...mockOrgAddons[0],
        enabled: false,
      }
      render(
        <OrgAddonsSettings {...defaultProps} initialAddons={[disabledAddon]} />
      )

      expect(
        screen.getByLabelText("Ativar Simulador de Financiamento")
      ).toBeInTheDocument()
    })
  })

  describe("unknown addon slugs", () => {
    it("displays slug as fallback name for unknown addons", () => {
      const unknownAddon: OrganizationAddon = {
        id: "oa-3",
        organizationId: "org-1",
        addonSlug: "unknown-addon",
        grantedAt: new Date("2024-01-01"),
        grantedBy: "admin-1",
        enabled: true,
        expiresAt: null,
      }
      render(
        <OrgAddonsSettings {...defaultProps} initialAddons={[unknownAddon]} />
      )

      expect(screen.getByText("unknown-addon")).toBeInTheDocument()
    })
  })

  describe("fetching addons", () => {
    it("fetches addons from API when no initial data provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ addons: mockOrgAddons }),
      })

      render(<OrgAddonsSettings {...defaultProps} />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/organizations/org-1/addons"
        )
      })

      await waitFor(() => {
        expect(
          screen.getByText("Simulador de Financiamento")
        ).toBeInTheDocument()
      })
    })

    it("does not fetch addons when initial data is provided", () => {
      render(
        <OrgAddonsSettings {...defaultProps} initialAddons={mockOrgAddons} />
      )

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it("shows error when fetch fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "Server error" }),
      })

      // Suppress console.error
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      render(<OrgAddonsSettings {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText("Falha ao carregar addons")).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })

    it("shows unauthorized error for 401 response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: "Unauthorized" }),
      })

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      render(<OrgAddonsSettings {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText("Não autorizado")).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })

    it("shows permission error for 403 response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: "Forbidden" }),
      })

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      render(<OrgAddonsSettings {...defaultProps} />)

      await waitFor(() => {
        expect(
          screen.getByText("Sem permissão para visualizar addons")
        ).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })
  })
})
