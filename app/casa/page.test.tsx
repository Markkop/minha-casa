import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import CasaPage from "./page"

// Mock the SimulatorClient component
vi.mock("./components/simulator-client", () => ({
  SimulatorClient: () => <div data-testid="simulator-client">Simulator Client Content</div>,
}))

// Mock the SettingsProvider component
vi.mock("./components/utils/settings", () => ({
  SettingsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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

describe("CasaPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOrgContext.mockReturnValue({ type: "personal" })
    mockUseAddonsLoading.mockReturnValue(false)
    mockHasAddon.mockReturnValue(false)
  })

  afterEach(() => {
    cleanup()
  })

  // ===========================================================================
  // Addon Access Guard Integration Tests
  // ===========================================================================

  describe("addon access guard integration", () => {
    it("checks access for the 'financiamento' addon", () => {
      mockHasAddon.mockReturnValue(true)

      render(<CasaPage />)

      expect(mockHasAddon).toHaveBeenCalledWith("financiamento")
    })

    it("shows loading state while checking addon access", () => {
      mockUseAddonsLoading.mockReturnValue(true)

      render(<CasaPage />)

      expect(screen.getByText("Verificando acesso...")).toBeInTheDocument()
      expect(screen.queryByTestId("simulator-client")).not.toBeInTheDocument()
    })

    it("shows access denied message when user has no financiamento addon access", () => {
      mockHasAddon.mockReturnValue(false)

      render(<CasaPage />)

      expect(screen.getByText("Acesso Restrito")).toBeInTheDocument()
      expect(screen.getByText(/Simulador de Financiamento/)).toBeInTheDocument()
      expect(screen.queryByTestId("simulator-client")).not.toBeInTheDocument()
    })

    it("renders SimulatorClient when user has addon access", () => {
      mockHasAddon.mockReturnValue(true)

      render(<CasaPage />)

      expect(screen.getByTestId("simulator-client")).toBeInTheDocument()
      expect(screen.queryByText("Acesso Restrito")).not.toBeInTheDocument()
    })

    it("renders SimulatorClient when org has addon access", () => {
      mockOrgContext.mockReturnValue({
        type: "organization",
        organizationId: "org-1",
        organizationName: "Test Org",
      })
      mockHasAddon.mockReturnValue(true)

      render(<CasaPage />)

      expect(screen.getByTestId("simulator-client")).toBeInTheDocument()
      expect(screen.queryByText("Acesso Restrito")).not.toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Access Denied State - Personal Context Tests
  // ===========================================================================

  describe("access denied state - personal context", () => {
    it("displays personal license option", () => {
      mockOrgContext.mockReturnValue({ type: "personal" })
      mockHasAddon.mockReturnValue(false)

      render(<CasaPage />)

      expect(screen.getByText("Licença Pessoal")).toBeInTheDocument()
      expect(screen.getByText("Licença via Organização")).toBeInTheDocument()
    })

    it("shows link to home page", () => {
      mockHasAddon.mockReturnValue(false)

      render(<CasaPage />)

      const homeLink = screen.getByRole("link", { name: /voltar ao início/i })
      expect(homeLink).toBeInTheDocument()
      expect(homeLink).toHaveAttribute("href", "/")
    })

    it("shows link to subscription page", () => {
      mockHasAddon.mockReturnValue(false)

      render(<CasaPage />)

      const subscribeLink = screen.getByRole("link", { name: /ver planos/i })
      expect(subscribeLink).toBeInTheDocument()
      expect(subscribeLink).toHaveAttribute("href", "/subscribe")
    })
  })

  // ===========================================================================
  // Access Denied State - Organization Context Tests
  // ===========================================================================

  describe("access denied state - organization context", () => {
    it("displays organization-specific message when in organization context", () => {
      mockOrgContext.mockReturnValue({
        type: "organization",
        organizationId: "org-1",
        organizationName: "Imobiliária XYZ",
      })
      mockHasAddon.mockReturnValue(false)

      render(<CasaPage />)

      expect(screen.getByText("Licença Pessoal")).toBeInTheDocument()
      expect(screen.getByText("Licença da Organização")).toBeInTheDocument()
      expect(screen.getByText("Imobiliária XYZ")).toBeInTheDocument()
    })

    it("shows organization name in access denied message", () => {
      mockOrgContext.mockReturnValue({
        type: "organization",
        organizationId: "org-2",
        organizationName: "Construtora ABC",
      })
      mockHasAddon.mockReturnValue(false)

      render(<CasaPage />)

      expect(screen.getByText("Construtora ABC")).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Dual Check (User OR Org) Access Tests
  // ===========================================================================

  describe("dual check access (user OR org)", () => {
    it("grants access when user has addon but org does not", () => {
      // User in an org context, but user has personal addon
      mockOrgContext.mockReturnValue({
        type: "organization",
        organizationId: "org-1",
        organizationName: "Test Org",
      })
      // hasAddon returns true because user has personal addon
      mockHasAddon.mockReturnValue(true)

      render(<CasaPage />)

      expect(screen.getByTestId("simulator-client")).toBeInTheDocument()
      expect(screen.queryByText("Acesso Restrito")).not.toBeInTheDocument()
    })

    it("grants access when org has addon but user does not", () => {
      mockOrgContext.mockReturnValue({
        type: "organization",
        organizationId: "org-1",
        organizationName: "Test Org",
      })
      // hasAddon returns true because org has the addon
      mockHasAddon.mockReturnValue(true)

      render(<CasaPage />)

      expect(screen.getByTestId("simulator-client")).toBeInTheDocument()
      expect(screen.queryByText("Acesso Restrito")).not.toBeInTheDocument()
    })

    it("denies access when neither user nor org has addon", () => {
      mockOrgContext.mockReturnValue({
        type: "organization",
        organizationId: "org-1",
        organizationName: "Test Org",
      })
      mockHasAddon.mockReturnValue(false)

      render(<CasaPage />)

      expect(screen.queryByTestId("simulator-client")).not.toBeInTheDocument()
      expect(screen.getByText("Acesso Restrito")).toBeInTheDocument()
    })
  })
})
