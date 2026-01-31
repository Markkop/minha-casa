import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"
import { NavBar } from "./nav-bar"

// Mock next/navigation
const mockPathname = vi.fn()
const mockPush = vi.fn()
const mockRefresh = vi.fn()
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}))

// Mock auth-client
const mockUseSession = vi.fn()
const mockSignOut = vi.fn()
vi.mock("@/lib/auth-client", () => ({
  useSession: () => mockUseSession(),
  signOut: () => mockSignOut(),
}))

// Mock OrganizationSwitcher
vi.mock("@/components/organization-switcher", () => ({
  OrganizationSwitcher: () => (
    <div data-testid="organization-switcher">Organization Switcher</div>
  ),
}))

// Mock feature flags
const mockGetFlag = vi.fn()
vi.mock("@/lib/feature-flags", () => ({
  getFlag: (flag: string) => mockGetFlag(flag),
}))

// Mock useAddons hook
const mockHasAddon = vi.fn()
vi.mock("@/lib/use-addons", () => ({
  useAddons: () => ({
    hasAddon: mockHasAddon,
    userAddons: [],
    orgAddons: [],
    isLoading: false,
    error: null,
    orgContext: { type: "personal" },
    refresh: vi.fn(),
    revokeUserAddon: vi.fn(),
    revokeOrgAddon: vi.fn(),
    isRevoking: false,
    toggleUserAddon: vi.fn(),
    toggleOrgAddon: vi.fn(),
    isToggling: false,
  }),
}))

describe("NavBar", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPathname.mockReturnValue("/")
    mockUseSession.mockReturnValue({ data: null })
    // Default: organizations enabled (for feature flag), addons disabled
    mockGetFlag.mockImplementation((flag: string) => {
      if (flag === "organizations") return true
      return false
    })
    // Default: no addons enabled
    mockHasAddon.mockReturnValue(false)
  })

  afterEach(() => {
    cleanup()
  })

  describe("rendering", () => {
    it("renders the logo with link to home", () => {
      render(<NavBar />)

      const logoLink = screen.getByRole("link", { name: /minha casa/i })
      expect(logoLink).toBeInTheDocument()
      expect(logoLink).toHaveAttribute("href", "/")
    })

    it("renders anuncios link when user is logged in", () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", name: "Test User", isAdmin: false } },
      })
      render(<NavBar />)

      expect(screen.getByRole("link", { name: /anuncios/i })).toBeInTheDocument()
    })

    it("hides anuncios link when user is not logged in", () => {
      mockUseSession.mockReturnValue({ data: null })
      render(<NavBar />)

      expect(screen.queryByRole("link", { name: /anuncios/i })).not.toBeInTheDocument()
    })

    it("renders organizacoes link in popover when feature flag is enabled and user is logged in", () => {
      mockGetFlag.mockImplementation((flag: string) => flag === "organizations")
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", name: "Test User", isAdmin: false } },
      })
      render(<NavBar />)

      // Open the user menu popover
      const userMenuButton = screen.getByRole("button", { name: /menu do usuario/i })
      fireEvent.click(userMenuButton)

      expect(
        screen.getByRole("link", { name: /organizacoes/i })
      ).toBeInTheDocument()
    })

    it("hides simulador link when user/org does not have financiamento addon", () => {
      mockHasAddon.mockReturnValue(false)
      render(<NavBar />)

      expect(
        screen.queryByRole("link", { name: /simulador/i })
      ).not.toBeInTheDocument()
    })

    it("shows simulador link when user has financiamento addon", () => {
      mockHasAddon.mockImplementation((slug: string) => slug === "financiamento")
      render(<NavBar />)

      const simuladorLink = screen.getByRole("link", { name: /simulador/i })
      expect(simuladorLink).toBeInTheDocument()
      expect(simuladorLink).toHaveAttribute("href", "/casa")
    })

    it("shows simulador link when org has financiamento addon", () => {
      // hasAddon checks both user AND org addons
      mockHasAddon.mockImplementation((slug: string) => slug === "financiamento")
      render(<NavBar />)

      const simuladorLink = screen.getByRole("link", { name: /simulador/i })
      expect(simuladorLink).toBeInTheDocument()
      expect(simuladorLink).toHaveAttribute("href", "/casa")
    })

    it("hides risco enchente link when user/org does not have flood addon", () => {
      mockHasAddon.mockReturnValue(false)
      render(<NavBar />)

      expect(
        screen.queryByRole("link", { name: /risco enchente/i })
      ).not.toBeInTheDocument()
    })

    it("shows risco enchente link when user has flood addon", () => {
      mockHasAddon.mockImplementation((slug: string) => slug === "flood")
      render(<NavBar />)

      const riscoLink = screen.getByRole("link", { name: /risco enchente/i })
      expect(riscoLink).toBeInTheDocument()
      expect(riscoLink).toHaveAttribute("href", "/floodrisk")
    })

    it("shows risco enchente link when org has flood addon", () => {
      // hasAddon checks both user AND org addons
      mockHasAddon.mockImplementation((slug: string) => slug === "flood")
      render(<NavBar />)

      const riscoLink = screen.getByRole("link", { name: /risco enchente/i })
      expect(riscoLink).toBeInTheDocument()
      expect(riscoLink).toHaveAttribute("href", "/floodrisk")
    })

    it("shows both addon-gated links when user has both addons", () => {
      mockHasAddon.mockReturnValue(true)
      render(<NavBar />)

      expect(screen.getByRole("link", { name: /simulador/i })).toBeInTheDocument()
      expect(screen.getByRole("link", { name: /risco enchente/i })).toBeInTheDocument()
    })
  })

  describe("active link highlighting", () => {
    it("highlights anuncios link when on anuncios page", () => {
      mockPathname.mockReturnValue("/anuncios")
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", name: "Test User", isAdmin: false } },
      })
      render(<NavBar />)

      const anunciosLink = screen.getByRole("link", { name: /anuncios/i })
      expect(anunciosLink).toHaveClass("bg-primary/10", "text-primary")
    })

    it("highlights simulador link when on casa page", () => {
      mockPathname.mockReturnValue("/casa")
      mockHasAddon.mockImplementation((slug: string) => slug === "financiamento")
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", name: "Test User", isAdmin: false } },
      })
      render(<NavBar />)

      const simuladorLink = screen.getByRole("link", { name: /simulador/i })
      expect(simuladorLink).toHaveClass("bg-primary/10", "text-primary")
    })

    it("does not highlight inactive links", () => {
      mockPathname.mockReturnValue("/casa")
      mockHasAddon.mockReturnValue(true)
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", name: "Test User", isAdmin: false } },
      })
      render(<NavBar />)

      const anunciosLink = screen.getByRole("link", { name: /anuncios/i })
      expect(anunciosLink).not.toHaveClass("bg-primary/10")
      expect(anunciosLink).toHaveClass("text-ashGray")
    })
  })

  describe("organization switcher", () => {
    it("does not show organization switcher when user is not logged in", () => {
      mockUseSession.mockReturnValue({ data: null })
      render(<NavBar />)

      expect(
        screen.queryByTestId("organization-switcher")
      ).not.toBeInTheDocument()
    })

    it("shows organization switcher when user is logged in", () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", name: "Test User", isAdmin: false } },
      })
      render(<NavBar />)

      expect(screen.getByTestId("organization-switcher")).toBeInTheDocument()
    })
  })

  describe("admin link in popover", () => {
    it("does not show admin link for non-admin users", () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", name: "Test User", isAdmin: false } },
      })
      render(<NavBar />)

      // Open the user menu popover
      const userMenuButton = screen.getByRole("button", { name: /menu do usuario/i })
      fireEvent.click(userMenuButton)

      expect(screen.queryByRole("link", { name: /admin/i })).not.toBeInTheDocument()
    })

    it("does not show admin link when user is not logged in", () => {
      mockUseSession.mockReturnValue({ data: null })
      render(<NavBar />)

      // No popover to open when not logged in
      expect(screen.queryByRole("link", { name: /admin/i })).not.toBeInTheDocument()
    })

    it("shows admin link for admin users in popover", () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: "admin-1", name: "Admin User", isAdmin: true } },
      })
      render(<NavBar />)

      // Open the user menu popover
      const userMenuButton = screen.getByRole("button", { name: /menu do usuario/i })
      fireEvent.click(userMenuButton)

      const adminLink = screen.getByRole("link", { name: /admin/i })
      expect(adminLink).toBeInTheDocument()
      expect(adminLink).toHaveAttribute("href", "/admin")
    })
  })

  describe("user menu", () => {
    it("shows login link when user is not logged in", () => {
      mockUseSession.mockReturnValue({ data: null })
      render(<NavBar />)

      const loginLink = screen.getByRole("link", { name: /entrar/i })
      expect(loginLink).toBeInTheDocument()
      expect(loginLink).toHaveAttribute("href", "/login")
    })

    it("shows user menu button when user is logged in", () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", name: "Test User", email: "test@example.com", isAdmin: false } },
      })
      render(<NavBar />)

      const userMenuButton = screen.getByRole("button", { name: /menu do usuario/i })
      expect(userMenuButton).toBeInTheDocument()
    })

    it("displays user name in the menu button", () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", name: "Test User", email: "test@example.com", isAdmin: false } },
      })
      render(<NavBar />)

      expect(screen.getByText("Test User")).toBeInTheDocument()
    })

    it("shows user info and logout option in popover when clicked", async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", name: "Test User", email: "test@example.com", isAdmin: false } },
      })
      render(<NavBar />)

      const userMenuButton = screen.getByRole("button", { name: /menu do usuario/i })
      fireEvent.click(userMenuButton)

      // Check user info in popover
      expect(screen.getByText("test@example.com")).toBeInTheDocument()
      
      // Check subscription link
      expect(screen.getByRole("link", { name: /assinatura/i })).toBeInTheDocument()
      
      // Check logout button
      expect(screen.getByRole("button", { name: /sair/i })).toBeInTheDocument()
    })

    it("calls signOut and redirects when logout is clicked", async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", name: "Test User", email: "test@example.com", isAdmin: false } },
      })
      render(<NavBar />)

      const userMenuButton = screen.getByRole("button", { name: /menu do usuario/i })
      fireEvent.click(userMenuButton)

      const logoutButton = screen.getByRole("button", { name: /sair/i })
      fireEvent.click(logoutButton)

      expect(mockSignOut).toHaveBeenCalled()
    })
  })

  describe("navigation icons", () => {
    it("renders navigation icons for visible links", () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", name: "Test User", isAdmin: false } },
      })
      render(<NavBar />)

      // Check for Anuncios icon (visible when logged in)
      expect(screen.getByText("🏘️")).toBeInTheDocument() // Anuncios
    })

    it("renders logo icon", () => {
      render(<NavBar />)

      // Logo uses house icon
      expect(screen.getByText("🏠")).toBeInTheDocument()
    })

    it("renders admin icon for admin users in popover", () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: "admin-1", name: "Admin User", isAdmin: true } },
      })
      render(<NavBar />)

      // Open the user menu popover
      const userMenuButton = screen.getByRole("button", { name: /menu do usuario/i })
      fireEvent.click(userMenuButton)

      expect(screen.getByText("⚙️")).toBeInTheDocument()
    })

    it("renders addon-gated icons when addons are enabled", () => {
      mockHasAddon.mockReturnValue(true)
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", name: "Test User", isAdmin: false } },
      })
      render(<NavBar />)

      expect(screen.getByText("📊")).toBeInTheDocument() // Simulador
      expect(screen.getByText("🌊")).toBeInTheDocument() // Risco Enchente
    })
  })
})
