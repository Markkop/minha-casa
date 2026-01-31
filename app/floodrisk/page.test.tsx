import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import FloodRiskPage from "./page"

// Mock next/dynamic to render the component synchronously
vi.mock("next/dynamic", () => ({
  default: () => {
    const Component = () => <div data-testid="floodrisk-client">FloodRisk Client Content</div>
    Component.displayName = "DynamicComponent"
    return Component
  },
}))

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

// Mock useAddons and useAddonsLoading hooks
const mockHasAddon = vi.fn()
const mockUseAddonsLoading = vi.fn()
const mockOrgContext = vi.fn()

vi.mock("@/lib/use-addons", () => ({
  useAddons: () => ({
    hasAddon: mockHasAddon,
    orgContext: mockOrgContext(),
  }),
  useAddonsLoading: () => mockUseAddonsLoading(),
}))

describe("FloodRiskPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOrgContext.mockReturnValue({ type: "personal" })
    mockUseAddonsLoading.mockReturnValue(false)
    mockHasAddon.mockReturnValue(false)
  })

  afterEach(() => {
    cleanup()
  })

  describe("addon access guard integration", () => {
    it("checks access for the 'flood' addon", () => {
      mockHasAddon.mockReturnValue(true)

      render(<FloodRiskPage />)

      expect(mockHasAddon).toHaveBeenCalledWith("flood")
    })

    it("shows loading state while checking addon access", () => {
      mockUseAddonsLoading.mockReturnValue(true)

      render(<FloodRiskPage />)

      expect(screen.getByText("Verificando acesso...")).toBeInTheDocument()
      expect(screen.queryByTestId("floodrisk-client")).not.toBeInTheDocument()
    })

    it("shows access denied message when user has no flood addon access", () => {
      mockHasAddon.mockReturnValue(false)

      render(<FloodRiskPage />)

      expect(screen.getByText("Acesso Restrito")).toBeInTheDocument()
      expect(screen.getByText(/Risco de Enchente/)).toBeInTheDocument()
      expect(screen.queryByTestId("floodrisk-client")).not.toBeInTheDocument()
    })

    it("renders FloodRiskClient when user has addon access", () => {
      mockHasAddon.mockReturnValue(true)

      render(<FloodRiskPage />)

      expect(screen.getByTestId("floodrisk-client")).toBeInTheDocument()
      expect(screen.queryByText("Acesso Restrito")).not.toBeInTheDocument()
    })

    it("renders FloodRiskClient when org has addon access", () => {
      mockOrgContext.mockReturnValue({
        type: "organization",
        organizationId: "org-1",
        organizationName: "Test Org",
      })
      mockHasAddon.mockReturnValue(true)

      render(<FloodRiskPage />)

      expect(screen.getByTestId("floodrisk-client")).toBeInTheDocument()
      expect(screen.queryByText("Acesso Restrito")).not.toBeInTheDocument()
    })
  })

  describe("access denied state - personal context", () => {
    it("displays personal license option", () => {
      mockOrgContext.mockReturnValue({ type: "personal" })
      mockHasAddon.mockReturnValue(false)

      render(<FloodRiskPage />)

      expect(screen.getByText("Licença Pessoal")).toBeInTheDocument()
      expect(screen.getByText("Licença via Organização")).toBeInTheDocument()
    })

    it("shows link to home page", () => {
      mockHasAddon.mockReturnValue(false)

      render(<FloodRiskPage />)

      const homeLink = screen.getByRole("link", { name: /voltar ao início/i })
      expect(homeLink).toBeInTheDocument()
      expect(homeLink).toHaveAttribute("href", "/")
    })

    it("shows link to subscription page", () => {
      mockHasAddon.mockReturnValue(false)

      render(<FloodRiskPage />)

      const subscribeLink = screen.getByRole("link", { name: /ver planos/i })
      expect(subscribeLink).toBeInTheDocument()
      expect(subscribeLink).toHaveAttribute("href", "/subscribe")
    })
  })

  describe("access denied state - organization context", () => {
    it("displays organization-specific message when in organization context", () => {
      mockOrgContext.mockReturnValue({
        type: "organization",
        organizationId: "org-1",
        organizationName: "Imobiliária XYZ",
      })
      mockHasAddon.mockReturnValue(false)

      render(<FloodRiskPage />)

      expect(screen.getByText("Licença Pessoal")).toBeInTheDocument()
      expect(screen.getByText("Licença da Organização")).toBeInTheDocument()
      expect(screen.getByText("Imobiliária XYZ")).toBeInTheDocument()
    })
  })
})
