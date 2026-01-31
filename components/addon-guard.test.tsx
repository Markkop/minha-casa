import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import { AddonGuard, AddonContent } from "./addon-guard"

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

describe("AddonGuard", () => {
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
  // Loading State Tests
  // ===========================================================================

  describe("loading state", () => {
    it("shows default loading message while checking addon access", () => {
      mockUseAddonsLoading.mockReturnValue(true)

      render(
        <AddonGuard addonSlug="financiamento" addonName="Simulador de Financiamento">
          <div>Protected Content</div>
        </AddonGuard>
      )

      expect(screen.getByText("Verificando acesso...")).toBeInTheDocument()
      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument()
    })

    it("shows custom loading component when provided", () => {
      mockUseAddonsLoading.mockReturnValue(true)

      render(
        <AddonGuard
          addonSlug="financiamento"
          addonName="Simulador de Financiamento"
          loadingComponent={<div>Custom Loading...</div>}
        >
          <div>Protected Content</div>
        </AddonGuard>
      )

      expect(screen.getByText("Custom Loading...")).toBeInTheDocument()
      expect(screen.queryByText("Verificando acesso...")).not.toBeInTheDocument()
      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Access Denied State Tests
  // ===========================================================================

  describe("access denied state", () => {
    it("shows default access denied message when user has no addon access", () => {
      mockHasAddon.mockReturnValue(false)

      render(
        <AddonGuard addonSlug="financiamento" addonName="Simulador de Financiamento">
          <div>Protected Content</div>
        </AddonGuard>
      )

      expect(screen.getByText("Acesso Restrito")).toBeInTheDocument()
      expect(screen.getByText(/Simulador de Financiamento/)).toBeInTheDocument()
      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument()
    })

    it("shows custom fallback component when provided and access denied", () => {
      mockHasAddon.mockReturnValue(false)

      render(
        <AddonGuard
          addonSlug="financiamento"
          addonName="Simulador de Financiamento"
          fallbackComponent={<div>Custom Access Denied</div>}
        >
          <div>Protected Content</div>
        </AddonGuard>
      )

      expect(screen.getByText("Custom Access Denied")).toBeInTheDocument()
      expect(screen.queryByText("Acesso Restrito")).not.toBeInTheDocument()
      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument()
    })

    it("renders nothing when showAccessDeniedUI is false and access denied", () => {
      mockHasAddon.mockReturnValue(false)

      const { container } = render(
        <AddonGuard
          addonSlug="financiamento"
          addonName="Simulador de Financiamento"
          showAccessDeniedUI={false}
        >
          <div>Protected Content</div>
        </AddonGuard>
      )

      expect(container).toBeEmptyDOMElement()
      expect(screen.queryByText("Acesso Restrito")).not.toBeInTheDocument()
      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument()
    })

    it("displays personal license option in personal context", () => {
      mockOrgContext.mockReturnValue({ type: "personal" })
      mockHasAddon.mockReturnValue(false)

      render(
        <AddonGuard addonSlug="financiamento" addonName="Simulador de Financiamento">
          <div>Protected Content</div>
        </AddonGuard>
      )

      expect(screen.getByText("Licença Pessoal")).toBeInTheDocument()
      expect(screen.getByText("Licença via Organização")).toBeInTheDocument()
    })

    it("displays organization-specific message when in organization context", () => {
      mockOrgContext.mockReturnValue({
        type: "organization",
        organizationId: "org-1",
        organizationName: "Test Org",
      })
      mockHasAddon.mockReturnValue(false)

      render(
        <AddonGuard addonSlug="financiamento" addonName="Simulador de Financiamento">
          <div>Protected Content</div>
        </AddonGuard>
      )

      expect(screen.getByText("Licença Pessoal")).toBeInTheDocument()
      expect(screen.getByText("Licença da Organização")).toBeInTheDocument()
      expect(screen.getByText("Test Org")).toBeInTheDocument()
    })

    it("shows link to home page", () => {
      mockHasAddon.mockReturnValue(false)

      render(
        <AddonGuard addonSlug="financiamento" addonName="Simulador de Financiamento">
          <div>Protected Content</div>
        </AddonGuard>
      )

      const homeLink = screen.getByRole("link", { name: /voltar ao início/i })
      expect(homeLink).toBeInTheDocument()
      expect(homeLink).toHaveAttribute("href", "/")
    })

    it("shows link to subscription page", () => {
      mockHasAddon.mockReturnValue(false)

      render(
        <AddonGuard addonSlug="financiamento" addonName="Simulador de Financiamento">
          <div>Protected Content</div>
        </AddonGuard>
      )

      const subscribeLink = screen.getByRole("link", { name: /ver planos/i })
      expect(subscribeLink).toBeInTheDocument()
      expect(subscribeLink).toHaveAttribute("href", "/subscribe")
    })

    it("checks the correct addon slug", () => {
      mockHasAddon.mockReturnValue(false)

      render(
        <AddonGuard addonSlug="flood" addonName="Risco de Enchente">
          <div>Protected Content</div>
        </AddonGuard>
      )

      expect(mockHasAddon).toHaveBeenCalledWith("flood")
      expect(screen.getByText(/Risco de Enchente/)).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Access Granted State Tests
  // ===========================================================================

  describe("access granted state", () => {
    it("renders children when user has addon access", () => {
      mockHasAddon.mockReturnValue(true)

      render(
        <AddonGuard addonSlug="financiamento" addonName="Simulador de Financiamento">
          <div>Protected Content</div>
        </AddonGuard>
      )

      expect(screen.getByText("Protected Content")).toBeInTheDocument()
      expect(screen.queryByText("Acesso Restrito")).not.toBeInTheDocument()
    })

    it("renders children when org has addon access", () => {
      mockOrgContext.mockReturnValue({
        type: "organization",
        organizationId: "org-1",
        organizationName: "Test Org",
      })
      mockHasAddon.mockReturnValue(true)

      render(
        <AddonGuard addonSlug="financiamento" addonName="Simulador de Financiamento">
          <div>Protected Content</div>
        </AddonGuard>
      )

      expect(screen.getByText("Protected Content")).toBeInTheDocument()
      expect(screen.queryByText("Acesso Restrito")).not.toBeInTheDocument()
    })

    it("renders complex children correctly", () => {
      mockHasAddon.mockReturnValue(true)

      render(
        <AddonGuard addonSlug="financiamento" addonName="Simulador de Financiamento">
          <div>
            <h1>Title</h1>
            <p>Description</p>
            <button>Action</button>
          </div>
        </AddonGuard>
      )

      expect(screen.getByRole("heading", { name: "Title" })).toBeInTheDocument()
      expect(screen.getByText("Description")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Action" })).toBeInTheDocument()
    })

    it("ignores custom fallback when access is granted", () => {
      mockHasAddon.mockReturnValue(true)

      render(
        <AddonGuard
          addonSlug="financiamento"
          addonName="Simulador de Financiamento"
          fallbackComponent={<div>Custom Access Denied</div>}
        >
          <div>Protected Content</div>
        </AddonGuard>
      )

      expect(screen.getByText("Protected Content")).toBeInTheDocument()
      expect(screen.queryByText("Custom Access Denied")).not.toBeInTheDocument()
    })

    it("ignores showAccessDeniedUI when access is granted", () => {
      mockHasAddon.mockReturnValue(true)

      render(
        <AddonGuard
          addonSlug="financiamento"
          addonName="Simulador de Financiamento"
          showAccessDeniedUI={false}
        >
          <div>Protected Content</div>
        </AddonGuard>
      )

      expect(screen.getByText("Protected Content")).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Addon Slug Check Tests
  // ===========================================================================

  describe("addon slug check", () => {
    it("calls hasAddon with the correct slug for financiamento", () => {
      mockHasAddon.mockReturnValue(true)

      render(
        <AddonGuard addonSlug="financiamento" addonName="Simulador de Financiamento">
          <div>Protected Content</div>
        </AddonGuard>
      )

      expect(mockHasAddon).toHaveBeenCalledWith("financiamento")
    })

    it("calls hasAddon with the correct slug for flood", () => {
      mockHasAddon.mockReturnValue(true)

      render(
        <AddonGuard addonSlug="flood" addonName="Risco de Enchente">
          <div>Protected Content</div>
        </AddonGuard>
      )

      expect(mockHasAddon).toHaveBeenCalledWith("flood")
    })

    it("calls hasAddon with custom addon slugs", () => {
      mockHasAddon.mockReturnValue(true)

      render(
        <AddonGuard addonSlug="custom-addon" addonName="Custom Addon">
          <div>Protected Content</div>
        </AddonGuard>
      )

      expect(mockHasAddon).toHaveBeenCalledWith("custom-addon")
    })
  })

  // ===========================================================================
  // Props Combination Tests
  // ===========================================================================

  describe("props combinations", () => {
    it("uses custom loading and fallback components together", () => {
      mockUseAddonsLoading.mockReturnValue(true)

      const { rerender } = render(
        <AddonGuard
          addonSlug="financiamento"
          addonName="Simulador de Financiamento"
          loadingComponent={<div>Custom Loading</div>}
          fallbackComponent={<div>Custom Fallback</div>}
        >
          <div>Protected Content</div>
        </AddonGuard>
      )

      // While loading, shows custom loading
      expect(screen.getByText("Custom Loading")).toBeInTheDocument()

      // Switch to loaded state with no access
      mockUseAddonsLoading.mockReturnValue(false)
      mockHasAddon.mockReturnValue(false)

      rerender(
        <AddonGuard
          addonSlug="financiamento"
          addonName="Simulador de Financiamento"
          loadingComponent={<div>Custom Loading</div>}
          fallbackComponent={<div>Custom Fallback</div>}
        >
          <div>Protected Content</div>
        </AddonGuard>
      )

      // Now shows custom fallback
      expect(screen.getByText("Custom Fallback")).toBeInTheDocument()
    })
  })
})

// ===========================================================================
// AddonContent Component Tests
// ===========================================================================

describe("AddonContent", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOrgContext.mockReturnValue({ type: "personal" })
    mockUseAddonsLoading.mockReturnValue(false)
    mockHasAddon.mockReturnValue(false)
  })

  afterEach(() => {
    cleanup()
  })

  it("renders children when user has addon access", () => {
    mockHasAddon.mockReturnValue(true)

    render(
      <AddonContent addonSlug="analytics">
        <div>Analytics Widget</div>
      </AddonContent>
    )

    expect(screen.getByText("Analytics Widget")).toBeInTheDocument()
  })

  it("renders nothing when user lacks addon access", () => {
    mockHasAddon.mockReturnValue(false)

    const { container } = render(
      <AddonContent addonSlug="analytics">
        <div>Analytics Widget</div>
      </AddonContent>
    )

    expect(container).toBeEmptyDOMElement()
  })

  it("shows default loading while checking access", () => {
    mockUseAddonsLoading.mockReturnValue(true)

    render(
      <AddonContent addonSlug="analytics">
        <div>Analytics Widget</div>
      </AddonContent>
    )

    expect(screen.getByText("Verificando acesso...")).toBeInTheDocument()
  })

  it("calls hasAddon with the correct slug", () => {
    mockHasAddon.mockReturnValue(true)

    render(
      <AddonContent addonSlug="premium-feature">
        <div>Premium Feature</div>
      </AddonContent>
    )

    expect(mockHasAddon).toHaveBeenCalledWith("premium-feature")
  })
})
