import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent, within, waitFor } from "@testing-library/react"
import { NavBar } from "./nav-bar"

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

const mockUseSession = vi.fn()
const mockSignOut = vi.fn()
vi.mock("@/lib/auth-client", () => ({
  useSession: () => mockUseSession(),
  signOut: () => mockSignOut(),
}))

vi.mock("@/components/organization-switcher", () => ({
  OrganizationSwitcher: () => (
    <div data-testid="organization-switcher">Organization Switcher</div>
  ),
  OrganizationBreadcrumbDropdown: () => (
    <button data-testid="organization-breadcrumb">Minha Casa Local</button>
  ),
  useOrganizations: () => ({
    organizations: [{ id: "org-1", name: "Org", slug: "org", role: "owner" }],
    loading: false,
    hasTeamOrganizations: true,
  }),
}))

vi.mock("@/app/anuncios/components/global-collection-toolbar", () => ({
  GlobalCollectionToolbar: () => (
    <div data-testid="global-collection-toolbar">Collection Toolbar</div>
  ),
  GlobalCollectionBreadcrumb: () => (
    <button data-testid="global-collection-breadcrumb">minha-casa-local</button>
  ),
}))

vi.mock("@/app/analise/components/listing-selector", () => ({
  AnaliseListingBreadcrumb: () => (
    <button data-testid="analise-listing-breadcrumb">Casa Alpha</button>
  ),
}))

vi.mock("@/app/anuncios/components/data-management", () => ({
  ImportExportMenuItems: () => null,
}))

const mockGetFlag = vi.fn()
vi.mock("@/lib/feature-flags", () => ({
  getFlag: (flag: string) => mockGetFlag(flag),
}))

const mockUseAdminFlag = vi.fn()
vi.mock("@/lib/admin-feature-flags-provider", () => ({
  useAdminFlag: (key: string) => mockUseAdminFlag(key),
}))

const mockHasAddon = vi.fn()
const mockRefreshSubscription = vi.fn()
let mockHasActiveSubscription = true
let mockSubscriptionReady = true

vi.mock("@/lib/subscription-context", () => ({
  useSubscriptionAccess: () => ({
    hasActiveSubscription: mockHasActiveSubscription,
    subscriptionReady: mockSubscriptionReady,
    refreshSubscription: mockRefreshSubscription,
  }),
}))

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
    mockUseSession.mockReturnValue({ data: null, isPending: false })
    mockGetFlag.mockImplementation((flag: string) => flag === "organizations")
    mockUseAdminFlag.mockReturnValue(false)
    mockHasAddon.mockReturnValue(false)
    mockHasActiveSubscription = true
    mockSubscriptionReady = true
    mockRefreshSubscription.mockResolvedValue(true)
  })

  afterEach(() => {
    cleanup()
  })

  it("renders logo linking to home when logged out", () => {
    render(<NavBar />)

    const logoLink = screen.getByRole("link", { name: /minha casa/i })
    expect(logoLink).toHaveAttribute("href", "/")
    expect(screen.queryByRole("link", { name: /anúncios/i })).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /abrir navegação/i })
    ).not.toBeInTheDocument()
  })

  it("renders workspace chrome while session is pending on workspace routes", () => {
    mockPathname.mockReturnValue("/anuncios")
    mockUseSession.mockReturnValue({ data: null, isPending: true })

    render(<NavBar />)

    expect(
      screen.getByRole("button", { name: /alternar navegação/i })
    ).toBeInTheDocument()
    expect(screen.getByTestId("workspace-loading-breadcrumb")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /entrar/i })).not.toBeInTheDocument()
  })

  it("renders core workspace links when logged in with active subscription", () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1", name: "Test User", email: "test@example.com" } },
      isPending: false,
    })

    render(<NavBar />)

    expect(screen.queryByRole("link", { name: /visão geral/i })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: /anúncios/i })).toHaveAttribute("href", "/anuncios")
    expect(screen.getByRole("link", { name: /comparação/i })).toHaveAttribute("href", "/comparacao")
    expect(screen.getByRole("link", { name: /análise/i })).toHaveAttribute("href", "/analise")
    expect(screen.getByRole("link", { name: /financiamento/i })).toHaveAttribute("href", "/financiamento")
    expect(screen.getByRole("link", { name: /links/i })).toHaveAttribute("href", "/links")
    expect(screen.queryByRole("link", { name: /contatos/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /regiões/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /condomínios/i })).not.toBeInTheDocument()
  })

  it("renders admin-gated workspace links when admin flags are enabled", () => {
    mockUseAdminFlag.mockImplementation((key: string) =>
      ["visaoGeral", "contatos", "regioes", "condominios"].includes(key)
    )
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1", name: "Test User", email: "test@example.com", isAdmin: true } },
      isPending: false,
    })

    render(<NavBar />)

    expect(screen.getByRole("link", { name: /visão geral/i })).toHaveAttribute("href", "/visao-geral")
    expect(screen.getByRole("link", { name: /contatos/i })).toHaveAttribute("href", "/contatos")
    expect(screen.getByRole("link", { name: /regiões/i })).toHaveAttribute("href", "/regioes")
    expect(screen.getByRole("link", { name: /condomínios/i })).toHaveAttribute("href", "/condominios")
  })

  it("links logo to anuncios for subscribed users", () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1", name: "Test User", email: "test@example.com" } },
      isPending: false,
    })

    render(<NavBar />)

    expect(screen.getByRole("link", { name: /minha casa/i })).toHaveAttribute("href", "/anuncios")
  })

  it("renders breadcrumb controls in the top bar", () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1", name: "Test User", email: "test@example.com" } },
      isPending: false,
    })

    render(<NavBar />)

    expect(screen.getByTestId("organization-breadcrumb")).toBeInTheDocument()
    expect(screen.getByTestId("global-collection-breadcrumb")).toBeInTheDocument()
  })

  it("renders the imóvel breadcrumb only on análise", () => {
    mockPathname.mockReturnValue("/analise")
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1", name: "Test User", email: "test@example.com" } },
      isPending: false,
    })

    render(<NavBar />)

    expect(screen.getByTestId("organization-breadcrumb")).toBeInTheDocument()
    expect(screen.getByTestId("global-collection-breadcrumb")).toBeInTheDocument()
    expect(screen.getByTestId("analise-listing-breadcrumb")).toBeInTheDocument()
  })

  it("does not render the imóvel breadcrumb outside análise", () => {
    mockPathname.mockReturnValue("/anuncios")
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1", name: "Test User", email: "test@example.com" } },
      isPending: false,
    })

    render(<NavBar />)

    expect(screen.getByTestId("organization-breadcrumb")).toBeInTheDocument()
    expect(screen.getByTestId("global-collection-breadcrumb")).toBeInTheDocument()
    expect(screen.queryByTestId("analise-listing-breadcrumb")).not.toBeInTheDocument()
  })

  it("hides workspace navigation when subscription is inactive", () => {
    mockHasActiveSubscription = false
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1", name: "Test User", email: "test@example.com" } },
      isPending: false,
    })

    render(<NavBar />)

    expect(screen.queryByRole("link", { name: /visão geral/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /anúncios/i })).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /abrir navegação/i })
    ).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: /minha casa/i })).toHaveAttribute(
      "href",
      "/subscribe"
    )
  })

  it("shows mobile navigation trigger when logged in with active subscription", () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1", name: "Test User", email: "test@example.com" } },
      isPending: false,
    })

    render(<NavBar />)

    expect(
      screen.getByRole("button", { name: /alternar navegação/i })
    ).toBeInTheDocument()
  })

  it("does not render the brand in the mobile sidebar sheet", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1", name: "Test User", email: "test@example.com" } },
      isPending: false,
    })

    render(<NavBar />)
    fireEvent.click(screen.getByRole("button", { name: /alternar navegação/i }))

    const mobileSidebar = await waitFor(() => {
      const element = document.querySelector('[data-slot="sidebar-mobile"]')
      expect(element).toBeInTheDocument()
      return element
    })
    expect(
      within(mobileSidebar as HTMLElement).queryByRole("link", {
        name: /minha casa/i,
      })
    ).not.toBeInTheDocument()
  })

  it("highlights current workspace link", () => {
    mockPathname.mockReturnValue("/comparacao")
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1", name: "Test User", email: "test@example.com" } },
      isPending: false,
    })

    render(<NavBar />)

    const comparisonLinks = screen.getAllByRole("link", { name: /comparação/i })
    expect(comparisonLinks.length).toBeGreaterThanOrEqual(1)
    expect(comparisonLinks[0]).toHaveClass(
      "bg-app-surface-muted",
      "text-app-fg"
    )
  })

  it("shows organization switcher and menu links when logged in", () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1", name: "Test User", email: "test@example.com", isAdmin: true } },
      isPending: false,
    })

    render(<NavBar />)
    expect(screen.getByTestId("organization-breadcrumb")).toBeInTheDocument()

    fireEvent.pointerDown(screen.getAllByRole("button", { name: /menu do usuario/i })[0])
    expect(screen.getByRole("menuitem", { name: /organizações/i })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: /feature flags/i })).toHaveAttribute(
      "href",
      "/admin/feature-flags"
    )
    expect(screen.getByRole("menuitem", { name: /admin/i })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: /assinatura/i })).toBeInTheDocument()
  })

  it("shows flood risk shortcut only when addon is enabled", () => {
    mockHasAddon.mockImplementation((slug: string) => slug === "flood")
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1", name: "Test User", email: "test@example.com" } },
      isPending: false,
    })

    render(<NavBar />)
    fireEvent.pointerDown(screen.getAllByRole("button", { name: /menu do usuario/i })[0])

    expect(screen.getByRole("menuitem", { name: /risco enchente/i })).toHaveAttribute("href", "/floodrisk")
  })
})
