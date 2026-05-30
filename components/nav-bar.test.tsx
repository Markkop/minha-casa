import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"
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
}))

vi.mock("@/app/anuncios/components/global-collection-toolbar", () => ({
  GlobalCollectionToolbar: () => (
    <div data-testid="global-collection-toolbar">Collection Toolbar</div>
  ),
  GlobalCollectionBreadcrumb: () => (
    <button data-testid="global-collection-breadcrumb">minha-casa-local</button>
  ),
}))

vi.mock("@/app/anuncios/components/data-management", () => ({
  ImportExportMenuItems: () => null,
}))

const mockGetFlag = vi.fn()
vi.mock("@/lib/feature-flags", () => ({
  getFlag: (flag: string) => mockGetFlag(flag),
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
    mockUseSession.mockReturnValue({ data: null })
    mockGetFlag.mockImplementation((flag: string) => flag === "organizations")
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

  it("renders workspace links when logged in with active subscription", () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1", name: "Test User", email: "test@example.com" } },
    })

    render(<NavBar />)

    expect(screen.getByRole("link", { name: /visão geral/i })).toHaveAttribute("href", "/visao-geral")
    expect(screen.getByRole("link", { name: /anúncios/i })).toHaveAttribute("href", "/anuncios")
    expect(screen.getByRole("link", { name: /comparação/i })).toHaveAttribute("href", "/comparacao")
    expect(screen.getByRole("link", { name: /financiamento/i })).toHaveAttribute("href", "/financiamento")
    expect(screen.getByRole("link", { name: /links/i })).toHaveAttribute("href", "/links")
    expect(screen.getByRole("link", { name: /contatos/i })).toHaveAttribute("href", "/contatos")
    expect(screen.getByRole("link", { name: /regiões/i })).toHaveAttribute("href", "/regioes")
    expect(screen.getByRole("link", { name: /condomínios/i })).toHaveAttribute("href", "/condominios")
  })

  it("renders breadcrumb controls in the top bar", () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1", name: "Test User", email: "test@example.com" } },
    })

    render(<NavBar />)

    expect(screen.getByTestId("organization-breadcrumb")).toBeInTheDocument()
    expect(screen.getByTestId("global-collection-breadcrumb")).toBeInTheDocument()
  })

  it("hides workspace navigation when subscription is inactive", () => {
    mockHasActiveSubscription = false
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1", name: "Test User", email: "test@example.com" } },
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
    })

    render(<NavBar />)

    expect(
      screen.getByRole("button", { name: /alternar navegação/i })
    ).toBeInTheDocument()
  })

  it("highlights current workspace link", () => {
    mockPathname.mockReturnValue("/comparacao")
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1", name: "Test User", email: "test@example.com" } },
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
    })

    render(<NavBar />)
    expect(screen.getByTestId("organization-breadcrumb")).toBeInTheDocument()

    fireEvent.pointerDown(screen.getAllByRole("button", { name: /menu do usuario/i })[0])
    expect(screen.getByRole("menuitem", { name: /organizações/i })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: /admin/i })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: /assinatura/i })).toBeInTheDocument()
  })

  it("shows flood risk shortcut only when addon is enabled", () => {
    mockHasAddon.mockImplementation((slug: string) => slug === "flood")
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1", name: "Test User", email: "test@example.com" } },
    })

    render(<NavBar />)
    fireEvent.pointerDown(screen.getAllByRole("button", { name: /menu do usuario/i })[0])

    expect(screen.getByRole("menuitem", { name: /risco enchente/i })).toHaveAttribute("href", "/floodrisk")
  })
})
