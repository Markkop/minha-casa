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
const mockUserAddons = vi.fn()
const mockOrgAddons = vi.fn()
vi.mock("@/lib/use-addons", () => ({
  useAddons: () => ({
    hasAddon: mockHasAddon,
    userAddons: mockUserAddons(),
    orgAddons: mockOrgAddons(),
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
    mockUserAddons.mockReturnValue([])
    mockOrgAddons.mockReturnValue([])
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

  // ===========================================================================
  // Addon Access Control Edge Cases
  // ===========================================================================

  describe("addon access control edge cases", () => {
    it("calls hasAddon with correct slug for each addon-gated link", () => {
      mockHasAddon.mockReturnValue(true)
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", name: "Test User", isAdmin: false } },
      })
      render(<NavBar />)

      // Verify hasAddon was called with both addon slugs
      expect(mockHasAddon).toHaveBeenCalledWith("financiamento")
      expect(mockHasAddon).toHaveBeenCalledWith("flood")
    })

    it("shows only financiamento link when user has only financiamento addon", () => {
      mockHasAddon.mockImplementation((slug: string) => slug === "financiamento")
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", name: "Test User", isAdmin: false } },
      })
      render(<NavBar />)

      expect(screen.getByRole("link", { name: /simulador/i })).toBeInTheDocument()
      expect(screen.queryByRole("link", { name: /risco enchente/i })).not.toBeInTheDocument()
    })

    it("shows only flood link when user has only flood addon", () => {
      mockHasAddon.mockImplementation((slug: string) => slug === "flood")
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", name: "Test User", isAdmin: false } },
      })
      render(<NavBar />)

      expect(screen.queryByRole("link", { name: /simulador/i })).not.toBeInTheDocument()
      expect(screen.getByRole("link", { name: /risco enchente/i })).toBeInTheDocument()
    })

    it("hides all addon-gated links when user has no addons", () => {
      mockHasAddon.mockReturnValue(false)
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", name: "Test User", isAdmin: false } },
      })
      render(<NavBar />)

      expect(screen.queryByRole("link", { name: /simulador/i })).not.toBeInTheDocument()
      expect(screen.queryByRole("link", { name: /risco enchente/i })).not.toBeInTheDocument()
    })

    it("shows anuncios link regardless of addon status when logged in", () => {
      mockHasAddon.mockReturnValue(false)
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", name: "Test User", isAdmin: false } },
      })
      render(<NavBar />)

      // Anuncios requires auth but not addons
      expect(screen.getByRole("link", { name: /anuncios/i })).toBeInTheDocument()
    })

    it("hides anuncios link when user is not logged in even with addons", () => {
      mockHasAddon.mockReturnValue(true)
      mockUseSession.mockReturnValue({ data: null })
      render(<NavBar />)

      // Anuncios requires auth
      expect(screen.queryByRole("link", { name: /anuncios/i })).not.toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Combined Auth and Addon Access Tests
  // ===========================================================================

  describe("combined auth and addon access", () => {
    it("shows all links when user is logged in with all addons", () => {
      mockHasAddon.mockReturnValue(true)
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", name: "Test User", isAdmin: false } },
      })
      render(<NavBar />)

      expect(screen.getByRole("link", { name: /minha casa/i })).toBeInTheDocument() // Logo/home
      expect(screen.getByRole("link", { name: /simulador/i })).toBeInTheDocument()
      expect(screen.getByRole("link", { name: /anuncios/i })).toBeInTheDocument()
      expect(screen.getByRole("link", { name: /risco enchente/i })).toBeInTheDocument()
    })

    it("shows only home link when user is not logged in and has no addons", () => {
      mockHasAddon.mockReturnValue(false)
      mockUseSession.mockReturnValue({ data: null })
      render(<NavBar />)

      expect(screen.getByRole("link", { name: /minha casa/i })).toBeInTheDocument() // Logo/home
      expect(screen.queryByRole("link", { name: /simulador/i })).not.toBeInTheDocument()
      expect(screen.queryByRole("link", { name: /anuncios/i })).not.toBeInTheDocument()
      expect(screen.queryByRole("link", { name: /risco enchente/i })).not.toBeInTheDocument()
    })

    it("shows addon links but hides anuncios when user is not logged in but addons are available", () => {
      // This tests the edge case where hasAddon returns true but user is not authenticated
      mockHasAddon.mockReturnValue(true)
      mockUseSession.mockReturnValue({ data: null })
      render(<NavBar />)

      // Addon links should be visible (addons don't require auth to show in nav)
      expect(screen.getByRole("link", { name: /simulador/i })).toBeInTheDocument()
      expect(screen.getByRole("link", { name: /risco enchente/i })).toBeInTheDocument()
      // Anuncios requires auth
      expect(screen.queryByRole("link", { name: /anuncios/i })).not.toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Navigation Link Count Tests
  // ===========================================================================

  describe("navigation link count", () => {
    it("renders correct number of nav links when all addons enabled and logged in", () => {
      mockHasAddon.mockReturnValue(true)
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", name: "Test User", isAdmin: false } },
      })
      render(<NavBar />)

      // Count visible nav links (excluding logo and user menu)
      // Should have: Simulador, Anuncios, Risco Enchente
      const navLinks = screen.getAllByRole("link").filter(
        (link) => 
          link.getAttribute("href") === "/casa" ||
          link.getAttribute("href") === "/anuncios" ||
          link.getAttribute("href") === "/floodrisk"
      )
      expect(navLinks).toHaveLength(3)
    })

    it("renders correct number of nav links when no addons and logged in", () => {
      mockHasAddon.mockReturnValue(false)
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", name: "Test User", isAdmin: false } },
      })
      render(<NavBar />)

      // Should only have Anuncios (no addon-gated links)
      const navLinks = screen.getAllByRole("link").filter(
        (link) => 
          link.getAttribute("href") === "/casa" ||
          link.getAttribute("href") === "/anuncios" ||
          link.getAttribute("href") === "/floodrisk"
      )
      expect(navLinks).toHaveLength(1) // Only anuncios
    })

    it("renders zero nav links when no addons and not logged in", () => {
      mockHasAddon.mockReturnValue(false)
      mockUseSession.mockReturnValue({ data: null })
      render(<NavBar />)

      // Should have no nav links (Anuncios requires auth, addon links require addons)
      const navLinks = screen.getAllByRole("link").filter(
        (link) => 
          link.getAttribute("href") === "/casa" ||
          link.getAttribute("href") === "/anuncios" ||
          link.getAttribute("href") === "/floodrisk"
      )
      expect(navLinks).toHaveLength(0)
    })
  })

  // ===========================================================================
  // Addon Shortcuts in User Menu
  // ===========================================================================

  describe("addon shortcuts in user menu", () => {
    it("does not show addon shortcuts section when user has no addons", () => {
      mockUserAddons.mockReturnValue([])
      mockOrgAddons.mockReturnValue([])
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", name: "Test User", email: "test@example.com", isAdmin: false } },
      })
      render(<NavBar />)

      // Open the user menu popover
      const userMenuButton = screen.getByRole("button", { name: /menu do usuario/i })
      fireEvent.click(userMenuButton)

      expect(screen.queryByText("Meus Addons")).not.toBeInTheDocument()
    })

    it("shows addon shortcuts section when user has user addons", () => {
      mockUserAddons.mockReturnValue([
        { id: "1", userId: "user-1", addonSlug: "financiamento", enabled: true, grantedAt: new Date(), grantedBy: null, expiresAt: null },
      ])
      mockOrgAddons.mockReturnValue([])
      mockHasAddon.mockImplementation((slug: string) => slug === "financiamento")
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", name: "Test User", email: "test@example.com", isAdmin: false } },
      })
      render(<NavBar />)

      // Open the user menu popover
      const userMenuButton = screen.getByRole("button", { name: /menu do usuario/i })
      fireEvent.click(userMenuButton)

      expect(screen.getByText("Meus Addons")).toBeInTheDocument()
    })

    it("shows addon shortcuts section when user has org addons", () => {
      mockUserAddons.mockReturnValue([])
      mockOrgAddons.mockReturnValue([
        { id: "1", organizationId: "org-1", addonSlug: "flood", enabled: true, grantedAt: new Date(), grantedBy: null, expiresAt: null },
      ])
      mockHasAddon.mockImplementation((slug: string) => slug === "flood")
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", name: "Test User", email: "test@example.com", isAdmin: false } },
      })
      render(<NavBar />)

      // Open the user menu popover
      const userMenuButton = screen.getByRole("button", { name: /menu do usuario/i })
      fireEvent.click(userMenuButton)

      expect(screen.getByText("Meus Addons")).toBeInTheDocument()
    })

    it("shows simulador shortcut in user menu when user has financiamento addon", () => {
      mockUserAddons.mockReturnValue([
        { id: "1", userId: "user-1", addonSlug: "financiamento", enabled: true, grantedAt: new Date(), grantedBy: null, expiresAt: null },
      ])
      mockOrgAddons.mockReturnValue([])
      mockHasAddon.mockImplementation((slug: string) => slug === "financiamento")
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", name: "Test User", email: "test@example.com", isAdmin: false } },
      })
      render(<NavBar />)

      // Open the user menu popover
      const userMenuButton = screen.getByRole("button", { name: /menu do usuario/i })
      fireEvent.click(userMenuButton)

      // Should have simulador link in popover (there's also one in the nav bar)
      const simuladorLinks = screen.getAllByRole("link", { name: /simulador/i })
      expect(simuladorLinks.length).toBeGreaterThanOrEqual(1)
      expect(simuladorLinks.some(link => link.getAttribute("href") === "/casa")).toBe(true)
    })

    it("shows risco enchente shortcut in user menu when user has flood addon", () => {
      mockUserAddons.mockReturnValue([
        { id: "1", userId: "user-1", addonSlug: "flood", enabled: true, grantedAt: new Date(), grantedBy: null, expiresAt: null },
      ])
      mockOrgAddons.mockReturnValue([])
      mockHasAddon.mockImplementation((slug: string) => slug === "flood")
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", name: "Test User", email: "test@example.com", isAdmin: false } },
      })
      render(<NavBar />)

      // Open the user menu popover
      const userMenuButton = screen.getByRole("button", { name: /menu do usuario/i })
      fireEvent.click(userMenuButton)

      // Should have risco enchente link in popover
      const floodLinks = screen.getAllByRole("link", { name: /risco enchente/i })
      expect(floodLinks.length).toBeGreaterThanOrEqual(1)
      expect(floodLinks.some(link => link.getAttribute("href") === "/floodrisk")).toBe(true)
    })

    it("shows multiple addon shortcuts when user has multiple addons", () => {
      mockUserAddons.mockReturnValue([
        { id: "1", userId: "user-1", addonSlug: "financiamento", enabled: true, grantedAt: new Date(), grantedBy: null, expiresAt: null },
        { id: "2", userId: "user-1", addonSlug: "flood", enabled: true, grantedAt: new Date(), grantedBy: null, expiresAt: null },
      ])
      mockOrgAddons.mockReturnValue([])
      mockHasAddon.mockReturnValue(true)
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", name: "Test User", email: "test@example.com", isAdmin: false } },
      })
      render(<NavBar />)

      // Open the user menu popover
      const userMenuButton = screen.getByRole("button", { name: /menu do usuario/i })
      fireEvent.click(userMenuButton)

      expect(screen.getByText("Meus Addons")).toBeInTheDocument()
      // Both shortcuts should be visible
      const simuladorLinks = screen.getAllByRole("link", { name: /simulador/i })
      const floodLinks = screen.getAllByRole("link", { name: /risco enchente/i })
      expect(simuladorLinks.length).toBeGreaterThanOrEqual(1)
      expect(floodLinks.length).toBeGreaterThanOrEqual(1)
    })

    it("does not show disabled addons in shortcuts", () => {
      mockUserAddons.mockReturnValue([
        { id: "1", userId: "user-1", addonSlug: "financiamento", enabled: false, grantedAt: new Date(), grantedBy: null, expiresAt: null },
      ])
      mockOrgAddons.mockReturnValue([])
      mockHasAddon.mockReturnValue(false)
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", name: "Test User", email: "test@example.com", isAdmin: false } },
      })
      render(<NavBar />)

      // Open the user menu popover
      const userMenuButton = screen.getByRole("button", { name: /menu do usuario/i })
      fireEvent.click(userMenuButton)

      // Disabled addon should not show in shortcuts
      expect(screen.queryByText("Meus Addons")).not.toBeInTheDocument()
    })

    it("shows addon shortcuts from org addons when user is in org context", () => {
      mockUserAddons.mockReturnValue([])
      mockOrgAddons.mockReturnValue([
        { id: "1", organizationId: "org-1", addonSlug: "financiamento", enabled: true, grantedAt: new Date(), grantedBy: null, expiresAt: null },
      ])
      mockHasAddon.mockImplementation((slug: string) => slug === "financiamento")
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", name: "Test User", email: "test@example.com", isAdmin: false } },
      })
      render(<NavBar />)

      // Open the user menu popover
      const userMenuButton = screen.getByRole("button", { name: /menu do usuario/i })
      fireEvent.click(userMenuButton)

      expect(screen.getByText("Meus Addons")).toBeInTheDocument()
      const simuladorLinks = screen.getAllByRole("link", { name: /simulador/i })
      expect(simuladorLinks.some(link => link.getAttribute("href") === "/casa")).toBe(true)
    })
  })
})
