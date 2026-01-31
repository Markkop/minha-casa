import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import { AddonAccessGuard } from "./addon-access-guard"

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

describe("AddonAccessGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOrgContext.mockReturnValue({ type: "personal" })
    mockUseAddonsLoading.mockReturnValue(false)
    mockHasAddon.mockReturnValue(false)
  })

  afterEach(() => {
    cleanup()
  })

  describe("loading state", () => {
    it("shows loading message while checking addon access", () => {
      mockUseAddonsLoading.mockReturnValue(true)

      render(
        <AddonAccessGuard addonSlug="financiamento" addonName="Simulador de Financiamento">
          <div>Protected Content</div>
        </AddonAccessGuard>
      )

      expect(screen.getByText("Verificando acesso...")).toBeInTheDocument()
      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument()
    })
  })

  describe("access denied state", () => {
    it("shows access denied message when user has no addon access", () => {
      mockHasAddon.mockReturnValue(false)

      render(
        <AddonAccessGuard addonSlug="financiamento" addonName="Simulador de Financiamento">
          <div>Protected Content</div>
        </AddonAccessGuard>
      )

      expect(screen.getByText("Acesso Restrito")).toBeInTheDocument()
      expect(screen.getByText(/Simulador de Financiamento/)).toBeInTheDocument()
      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument()
    })

    it("displays personal license option in personal context", () => {
      mockOrgContext.mockReturnValue({ type: "personal" })
      mockHasAddon.mockReturnValue(false)

      render(
        <AddonAccessGuard addonSlug="financiamento" addonName="Simulador de Financiamento">
          <div>Protected Content</div>
        </AddonAccessGuard>
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
        <AddonAccessGuard addonSlug="financiamento" addonName="Simulador de Financiamento">
          <div>Protected Content</div>
        </AddonAccessGuard>
      )

      expect(screen.getByText("Licença Pessoal")).toBeInTheDocument()
      expect(screen.getByText("Licença da Organização")).toBeInTheDocument()
      expect(screen.getByText("Test Org")).toBeInTheDocument()
    })

    it("shows link to home page", () => {
      mockHasAddon.mockReturnValue(false)

      render(
        <AddonAccessGuard addonSlug="financiamento" addonName="Simulador de Financiamento">
          <div>Protected Content</div>
        </AddonAccessGuard>
      )

      const homeLink = screen.getByRole("link", { name: /voltar ao início/i })
      expect(homeLink).toBeInTheDocument()
      expect(homeLink).toHaveAttribute("href", "/")
    })

    it("shows link to subscription page", () => {
      mockHasAddon.mockReturnValue(false)

      render(
        <AddonAccessGuard addonSlug="financiamento" addonName="Simulador de Financiamento">
          <div>Protected Content</div>
        </AddonAccessGuard>
      )

      const subscribeLink = screen.getByRole("link", { name: /ver planos/i })
      expect(subscribeLink).toBeInTheDocument()
      expect(subscribeLink).toHaveAttribute("href", "/subscribe")
    })

    it("checks the correct addon slug", () => {
      mockHasAddon.mockReturnValue(false)

      render(
        <AddonAccessGuard addonSlug="flood" addonName="Risco de Enchente">
          <div>Protected Content</div>
        </AddonAccessGuard>
      )

      expect(mockHasAddon).toHaveBeenCalledWith("flood")
      expect(screen.getByText(/Risco de Enchente/)).toBeInTheDocument()
    })
  })

  describe("access granted state", () => {
    it("renders children when user has addon access", () => {
      mockHasAddon.mockReturnValue(true)

      render(
        <AddonAccessGuard addonSlug="financiamento" addonName="Simulador de Financiamento">
          <div>Protected Content</div>
        </AddonAccessGuard>
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
        <AddonAccessGuard addonSlug="financiamento" addonName="Simulador de Financiamento">
          <div>Protected Content</div>
        </AddonAccessGuard>
      )

      expect(screen.getByText("Protected Content")).toBeInTheDocument()
      expect(screen.queryByText("Acesso Restrito")).not.toBeInTheDocument()
    })

    it("renders complex children correctly", () => {
      mockHasAddon.mockReturnValue(true)

      render(
        <AddonAccessGuard addonSlug="financiamento" addonName="Simulador de Financiamento">
          <div>
            <h1>Title</h1>
            <p>Description</p>
            <button>Action</button>
          </div>
        </AddonAccessGuard>
      )

      expect(screen.getByRole("heading", { name: "Title" })).toBeInTheDocument()
      expect(screen.getByText("Description")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Action" })).toBeInTheDocument()
    })
  })

  describe("addon slug check", () => {
    it("calls hasAddon with the correct slug for financiamento", () => {
      mockHasAddon.mockReturnValue(true)

      render(
        <AddonAccessGuard addonSlug="financiamento" addonName="Simulador de Financiamento">
          <div>Protected Content</div>
        </AddonAccessGuard>
      )

      expect(mockHasAddon).toHaveBeenCalledWith("financiamento")
    })

    it("calls hasAddon with the correct slug for flood", () => {
      mockHasAddon.mockReturnValue(true)

      render(
        <AddonAccessGuard addonSlug="flood" addonName="Risco de Enchente">
          <div>Protected Content</div>
        </AddonAccessGuard>
      )

      expect(mockHasAddon).toHaveBeenCalledWith("flood")
    })
  })
})
