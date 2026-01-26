import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { SubscribeClient } from "./subscribe-client"

// Mock auth-client
const mockUseSession = vi.fn()
vi.mock("@/lib/auth-client", () => ({
  useSession: () => mockUseSession(),
}))

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) => <a href={href}>{children}</a>,
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock plan data
const mockPlan = {
  id: "plan-plus",
  name: "Plus",
  slug: "plus",
  description: "Premium plan for power users",
  priceInCents: 2000,
  isActive: true,
  limits: {
    collectionsLimit: 10,
    listingsPerCollection: 200,
    aiParsesPerMonth: 100,
    canShare: true,
    canCreateOrg: true,
  },
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
}

const mockFreePlan = {
  id: "plan-free",
  name: "Free",
  slug: "free",
  description: "Basic plan for getting started",
  priceInCents: 0,
  isActive: true,
  limits: {
    collectionsLimit: 3,
    listingsPerCollection: 25,
    aiParsesPerMonth: 5,
    canShare: false,
    canCreateOrg: false,
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
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
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
      json: async () => ({ plans: [mockPlan, mockFreePlan] }),
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

  it("renders available plans", async () => {
    mockUseSession.mockReturnValue({
      data: null,
      isPending: false,
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ plans: [mockPlan, mockFreePlan] }),
    })

    render(<SubscribeClient />)

    await waitFor(() => {
      expect(screen.getByText("Plus")).toBeInTheDocument()
      expect(screen.getByText("Free")).toBeInTheDocument()
    })

    // Check plan descriptions
    expect(screen.getByText("Premium plan for power users")).toBeInTheDocument()
    expect(
      screen.getByText("Basic plan for getting started")
    ).toBeInTheDocument()
  })

  it("renders plan prices correctly", async () => {
    mockUseSession.mockReturnValue({
      data: null,
      isPending: false,
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ plans: [mockPlan, mockFreePlan] }),
    })

    render(<SubscribeClient />)

    await waitFor(() => {
      expect(screen.getByText("R$ 20,00")).toBeInTheDocument()
      expect(screen.getByText("Gratis")).toBeInTheDocument()
    })
  })

  it("renders plan limits correctly", async () => {
    mockUseSession.mockReturnValue({
      data: null,
      isPending: false,
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ plans: [mockPlan] }),
    })

    render(<SubscribeClient />)

    await waitFor(() => {
      expect(screen.getByText(/10 colecoes/i)).toBeInTheDocument()
      expect(screen.getByText(/200 anuncios por colecao/i)).toBeInTheDocument()
      expect(screen.getByText(/100 parses de ia por mes/i)).toBeInTheDocument()
      expect(
        screen.getByText(/compartilhamento de colecoes/i)
      ).toBeInTheDocument()
      expect(screen.getByText(/criar organizacoes/i)).toBeInTheDocument()
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
        json: async () => ({ plans: [mockPlan, mockFreePlan] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          subscription: mockSubscription,
          plan: mockPlan,
        }),
      })

    render(<SubscribeClient />)

    await waitFor(() => {
      expect(screen.getByText("Sua Assinatura")).toBeInTheDocument()
    })

    // Check subscription details
    expect(screen.getByText("Ativo")).toBeInTheDocument()
    expect(screen.getByText("Test subscription")).toBeInTheDocument()
  })

  it("shows 'Seu Plano' badge on current plan", async () => {
    mockUseSession.mockReturnValue({
      data: { user: mockUser },
      isPending: false,
    })

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plans: [mockPlan, mockFreePlan] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          subscription: mockSubscription,
          plan: mockPlan,
        }),
      })

    render(<SubscribeClient />)

    await waitFor(() => {
      expect(screen.getByText("Seu Plano")).toBeInTheDocument()
    })

    // The current plan button should be disabled
    const currentPlanButton = screen.getByRole("button", { name: /plano atual/i })
    expect(currentPlanButton).toBeDisabled()
  })

  it("shows message when user has no subscription", async () => {
    mockUseSession.mockReturnValue({
      data: { user: mockUser },
      isPending: false,
    })

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plans: [mockPlan] }),
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

  it("shows empty plans message when no plans available", async () => {
    mockUseSession.mockReturnValue({
      data: null,
      isPending: false,
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ plans: [] }),
    })

    render(<SubscribeClient />)

    await waitFor(() => {
      expect(
        screen.getByText(/nenhum plano disponivel no momento/i)
      ).toBeInTheDocument()
    })
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
      expect(screen.getByRole("alert")).toHaveTextContent(
        /erro ao carregar planos/i
      )
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
      json: async () => ({ plans: [mockPlan] }),
    })

    render(<SubscribeClient />)

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: /assinatura/i })
      ).toBeInTheDocument()
    })
  })

  it("renders subscription status correctly for different statuses", async () => {
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
        json: async () => ({ plans: [mockPlan] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          subscription: expiredSubscription,
          plan: mockPlan,
        }),
      })

    render(<SubscribeClient />)

    await waitFor(() => {
      expect(screen.getByText("Expirado")).toBeInTheDocument()
    })
  })

  it("shows 'Solicitar Plano' button for non-current plans", async () => {
    mockUseSession.mockReturnValue({
      data: { user: mockUser },
      isPending: false,
    })

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plans: [mockPlan, mockFreePlan] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          subscription: mockSubscription,
          plan: mockPlan,
        }),
      })

    render(<SubscribeClient />)

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /solicitar plano/i })
      ).toBeInTheDocument()
    })
  })
})
