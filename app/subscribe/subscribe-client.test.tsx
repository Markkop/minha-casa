import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { SubscribeClient } from "./subscribe-client"

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}))

const mockUseSession = vi.fn()
vi.mock("@/lib/auth-client", () => ({
  useSession: () => mockUseSession(),
}))

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) => <a href={href}>{children}</a>,
}))

vi.mock("./plan-display", () => ({
  PARTNER_CONTACT_HREF: "mailto:?subject=test",
  SUBSCRIBE_TIER_ORDER: ["plus", "pro", "partner"],
  PLAN_DISPLAY: {
    plus: {
      name: "Plus",
      description: "Desc Plus",
      priceFallbackLabel: "R$ 20,00",
      priceSuffix: "/mês",
      features: ["Feature Plus A", "Feature Plus B"],
      cta: "checkout",
    },
    pro: {
      name: "Pro",
      description: "Desc Pro",
      priceFallbackLabel: "",
      priceLabel: "R$ 200,00",
      priceSuffix: "/mês",
      features: ["Feature Pro A", "Feature Pro B"],
      cta: "coming_soon",
    },
    partner: {
      name: "Partner",
      description: "Desc Partner",
      priceFallbackLabel: "",
      priceLabel: "Sob consulta",
      features: ["Feature Partner A"],
      cta: "contact",
    },
  },
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

const mockPlanPlus = {
  id: "plan-plus",
  name: "Plus",
  slug: "plus",
  description: "Acesso Premium",
  priceInCents: 2000,
  isActive: true,
  stripePriceId: "price_test_123",
  limits: {
    collectionsLimit: 10 as number | null,
    listingsPerCollection: 200 as number | null,
    aiParsesPerMonth: 100 as number | null,
    canShare: true,
    canCreateOrg: true,
  },
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
}

const mockPlanTeste = {
  id: "plan-teste",
  name: "Teste",
  slug: "teste",
  description: "Interno",
  priceInCents: 0,
  isActive: true,
  stripePriceId: null,
  limits: {
    collectionsLimit: null as number | null,
    listingsPerCollection: null as number | null,
    aiParsesPerMonth: null as number | null,
    canShare: true,
    canCreateOrg: true,
  },
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
}

const mockSubscription = {
  id: "sub-123",
  userId: "user-123",
  planId: "plan-plus",
  status: "active" as const,
  startsAt: "2024-01-01T00:00:00.000Z",
  expiresAt: "2024-12-31T00:00:00.000Z",
  grantedBy: "admin-123",
  notes: "Test subscription",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
}

const mockUser = {
  id: "user-123",
  email: "test@example.com",
  name: "Test User",
}

describe("SubscribeClient", () => {
  const originalLocationDescriptor = Object.getOwnPropertyDescriptor(
    window,
    "location"
  )

  beforeAll(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { href: "" },
    })
  })

  afterAll(() => {
    if (originalLocationDescriptor) {
      Object.defineProperty(window, "location", originalLocationDescriptor)
    }
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
    window.location.href = ""
  })

  it("renders loading state while fetching data", () => {
    mockUseSession.mockReturnValue({
      data: null,
      isPending: true,
    })

    render(<SubscribeClient />)

    expect(screen.getByRole("status")).toBeInTheDocument()
  })

  it("renders login prompt when user is not authenticated", async () => {
    mockUseSession.mockReturnValue({
      data: null,
      isPending: false,
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        plans: [mockPlanTeste, mockPlanPlus],
        stripeTestMode: false,
      }),
    })

    render(<SubscribeClient />)

    await waitFor(() => {
      expect(
        screen.getByText(/faca login para ver sua assinatura/i)
      ).toBeInTheDocument()
    })

    expect(screen.getByRole("link", { name: /entrar/i })).toHaveAttribute(
      "href",
      "/login?redirect=/subscribe"
    )
    expect(screen.getByRole("link", { name: /criar conta/i })).toHaveAttribute(
      "href",
      "/signup?redirect=/subscribe"
    )
  })

  it("renders three tiers and hides internal test plan from the grid", async () => {
    mockUseSession.mockReturnValue({
      data: null,
      isPending: false,
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        plans: [mockPlanTeste, mockPlanPlus],
        stripeTestMode: false,
      }),
    })

    render(<SubscribeClient />)

    await waitFor(() => {
      expect(screen.getByTestId("tier-card-plus-title")).toHaveTextContent("Plus")
      expect(screen.getByTestId("tier-card-pro-title")).toHaveTextContent("Pro")
      expect(screen.getByTestId("tier-card-partner-title")).toHaveTextContent(
        "Partner"
      )
    })

    expect(screen.queryByTestId("tier-card-teste")).not.toBeInTheDocument()
  })

  it("renders plan prices correctly for checkout and teaser tiers", async () => {
    mockUseSession.mockReturnValue({
      data: null,
      isPending: false,
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ plans: [mockPlanPlus], stripeTestMode: false }),
    })

    render(<SubscribeClient />)

    await waitFor(() => {
      expect(screen.getByTestId("tier-card-plus-price")).toHaveTextContent(/R\$ 20/)
      expect(screen.getByTestId("tier-card-pro-price")).toHaveTextContent(/R\$ 200/)
      expect(screen.getByTestId("tier-card-partner-price")).toHaveTextContent(
        /Sob consulta/i
      )
    })
  })

  it("renders static tier feature bullets instead of limits JSON", async () => {
    mockUseSession.mockReturnValue({
      data: null,
      isPending: false,
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ plans: [mockPlanPlus], stripeTestMode: false }),
    })

    render(<SubscribeClient />)

    await waitFor(() => {
      expect(screen.getByText("Feature Plus A")).toBeInTheDocument()
      expect(screen.getByText("Feature Pro A")).toBeInTheDocument()
      expect(screen.getByText("Feature Partner A")).toBeInTheDocument()
      expect(screen.queryByText(/10 colecoes/i)).not.toBeInTheDocument()
    })
  })

  it("shows current subscription when user has one", async () => {
    mockUseSession.mockReturnValue({
      data: { user: mockUser },
      isPending: false,
    })

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plans: [mockPlanPlus], stripeTestMode: false }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          subscription: mockSubscription,
          plan: mockPlanPlus,
        }),
      })

    render(<SubscribeClient />)

    await waitFor(() => {
      expect(screen.getByText("Sua Assinatura")).toBeInTheDocument()
    })

    expect(screen.getByText("Ativo")).toBeInTheDocument()
  })

  it("shows 'Seu Plano' badge on current Plus plan", async () => {
    mockUseSession.mockReturnValue({
      data: { user: mockUser },
      isPending: false,
    })

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plans: [mockPlanPlus], stripeTestMode: false }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          subscription: mockSubscription,
          plan: mockPlanPlus,
        }),
      })

    render(<SubscribeClient />)

    await waitFor(() => {
      expect(screen.getByText("Seu Plano")).toBeInTheDocument()
    })

    expect(screen.getByRole("button", { name: /plano atual/i })).toBeDisabled()
  })

  it("shows message when user has no subscription", async () => {
    mockUseSession.mockReturnValue({
      data: { user: mockUser },
      isPending: false,
    })

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plans: [mockPlanPlus], stripeTestMode: false }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          subscription: null,
          plan: null,
        }),
      })

    render(<SubscribeClient />)

    await waitFor(() => {
      expect(
        screen.getByText(/voce ainda nao possui uma assinatura ativa/i)
      ).toBeInTheDocument()
    })
  })

  it("shows Pro and Partner when API returns empty plans plus a Plus warning banner", async () => {
    mockUseSession.mockReturnValue({
      data: null,
      isPending: false,
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ plans: [], stripeTestMode: false }),
    })

    render(<SubscribeClient />)

    await waitFor(() => {
      expect(screen.getByText(/plano plus nao foi carregado/i)).toBeInTheDocument()
    })

    expect(screen.getByTestId("tier-card-plus-title")).toHaveTextContent("Plus")
    expect(screen.getByTestId("tier-card-pro-title")).toHaveTextContent("Pro")
    expect(screen.getByTestId("tier-card-partner-title")).toHaveTextContent(
      "Partner"
    )
  })

  it("shows error state when plans fetch fails", async () => {
    mockUseSession.mockReturnValue({
      data: null,
      isPending: false,
    })

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    render(<SubscribeClient />)

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/erro ao carregar planos/i)
    })

    expect(
      screen.getByRole("button", { name: /tentar novamente/i })
    ).toBeInTheDocument()
  })

  it("renders page title correctly", async () => {
    mockUseSession.mockReturnValue({
      data: null,
      isPending: false,
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ plans: [mockPlanPlus], stripeTestMode: false }),
    })

    render(<SubscribeClient />)

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: /assinatura/i })
      ).toBeInTheDocument()
    })
  })

  it("renders subscription status correctly for expired", async () => {
    const expiredSubscription = {
      ...mockSubscription,
      status: "expired" as const,
    }

    mockUseSession.mockReturnValue({
      data: { user: mockUser },
      isPending: false,
    })

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plans: [mockPlanPlus], stripeTestMode: false }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          subscription: expiredSubscription,
          plan: mockPlanPlus,
        }),
      })

    render(<SubscribeClient />)

    await waitFor(() => {
      expect(screen.getByText("Expirado")).toBeInTheDocument()
    })
  })

  it("shows Em breve on Pro and enables Partner mailto button when user is logged in", async () => {
    mockUseSession.mockReturnValue({
      data: { user: mockUser },
      isPending: false,
    })

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plans: [mockPlanPlus], stripeTestMode: false }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          subscription: mockSubscription,
          plan: mockPlanPlus,
        }),
      })

    render(<SubscribeClient />)

    await waitFor(() => {
      expect(screen.getByTestId("tier-card-pro-button")).toBeDisabled()
      expect(screen.getByTestId("tier-card-pro-button")).toHaveTextContent(
        /em breve/i
      )
      expect(screen.getByTestId("tier-card-partner-button")).not.toBeDisabled()
      expect(screen.getByTestId("tier-card-partner-button")).toHaveTextContent(
        /falar com a equipe/i
      )
    })

    fireEvent.click(screen.getByTestId("tier-card-partner-button"))

    expect(window.location.href).toBe("mailto:?subject=test")
  })

  it("allows logged-in user without subscription to start Checkout on Plus", async () => {
    mockUseSession.mockReturnValue({
      data: { user: mockUser },
      isPending: false,
    })

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plans: [mockPlanPlus], stripeTestMode: false }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          subscription: null,
          plan: null,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          checkoutUrl: "https://checkout.stripe.com/test",
        }),
      })

    render(<SubscribeClient />)

    await waitFor(() => {
      expect(screen.getByTestId("tier-card-plus-button")).toHaveTextContent(
        /assinar agora/i
      )
    })

    fireEvent.click(screen.getByTestId("tier-card-plus-button"))

    await waitFor(() => {
      expect(window.location.href).toBe("https://checkout.stripe.com/test")
    })
  })
})
