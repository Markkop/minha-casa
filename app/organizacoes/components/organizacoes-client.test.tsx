import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react"
import { OrganizacoesClient } from "./organizacoes-client"

// Mock next/navigation
const mockPush = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock auth-client
const mockUseSession = vi.fn()
vi.mock("@/lib/auth-client", () => ({
  useSession: () => mockUseSession(),
}))

// Mock alert
const mockAlert = vi.fn()

const mockSession = {
  user: {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
  },
}

const mockOrganizations = [
  {
    id: "org-1",
    name: "Test Organization",
    slug: "test-org",
    ownerId: "user-123",
    role: "owner" as const,
    joinedAt: "2024-01-15T00:00:00.000Z",
    createdAt: "2024-01-15T00:00:00.000Z",
    updatedAt: "2024-01-15T00:00:00.000Z",
  },
  {
    id: "org-2",
    name: "Another Org",
    slug: "another-org",
    ownerId: "user-456",
    role: "member" as const,
    joinedAt: "2024-02-01T00:00:00.000Z",
    createdAt: "2024-02-01T00:00:00.000Z",
    updatedAt: "2024-02-01T00:00:00.000Z",
  },
]

const mockMembers = [
  {
    id: "member-1",
    userId: "user-123",
    role: "owner" as const,
    joinedAt: "2024-01-15T00:00:00.000Z",
    userName: "Test User",
    userEmail: "test@example.com",
    userImage: null,
  },
  {
    id: "member-2",
    userId: "user-456",
    role: "member" as const,
    joinedAt: "2024-01-20T00:00:00.000Z",
    userName: "Other User",
    userEmail: "other@example.com",
    userImage: null,
  },
]

// Helper to setup fetch mock with URL-based responses
function setupFetchMock(responses: Record<string, { data: unknown; ok?: boolean; status?: number }>) {
  return vi.fn((url: string) => {
    for (const [pattern, response] of Object.entries(responses)) {
      if (url.includes(pattern)) {
        return Promise.resolve({
          ok: response.ok ?? true,
          status: response.status ?? 200,
          json: () => Promise.resolve(response.data),
        })
      }
    }
    // Default fallback
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ organizations: [] }),
    })
  })
}

describe("OrganizacoesClient", () => {
  let originalFetch: typeof global.fetch
  let originalAlert: typeof global.alert

  beforeEach(() => {
    originalFetch = global.fetch
    originalAlert = global.alert
    global.alert = mockAlert
    vi.clearAllMocks()
    mockUseSession.mockReturnValue({
      data: mockSession,
      isPending: false,
    })
  })

  afterEach(() => {
    cleanup()
    global.fetch = originalFetch
    global.alert = originalAlert
  })

  it("shows loading state while session is pending", () => {
    mockUseSession.mockReturnValue({
      data: null,
      isPending: true,
    })

    global.fetch = setupFetchMock({
      "/api/organizations": { data: { organizations: [] } },
    })

    render(<OrganizacoesClient />)

    expect(screen.getByText("Carregando...")).toBeInTheDocument()
  })

  it("redirects to login when not authenticated", async () => {
    mockUseSession.mockReturnValue({
      data: null,
      isPending: false,
    })

    global.fetch = setupFetchMock({
      "/api/organizations": { data: { organizations: [] } },
    })

    render(<OrganizacoesClient />)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login?redirect=/organizacoes")
    })
  })

  it("fetches and displays organizations", async () => {
    global.fetch = setupFetchMock({
      "/api/organizations": { data: { organizations: mockOrganizations } },
    })

    render(<OrganizacoesClient />)

    await waitFor(() => {
      expect(screen.getByText("Test Organization")).toBeInTheDocument()
      expect(screen.getByText("Another Org")).toBeInTheDocument()
    })
  })

  it("displays empty state when no organizations", async () => {
    global.fetch = setupFetchMock({
      "/api/organizations": { data: { organizations: [] } },
    })

    render(<OrganizacoesClient />)

    await waitFor(() => {
      expect(
        screen.getByText("Voce ainda nao faz parte de nenhuma organizacao.")
      ).toBeInTheDocument()
    })
  })

  it("shows error state on fetch failure", async () => {
    global.fetch = setupFetchMock({
      "/api/organizations": { data: { error: "Server error" }, ok: false, status: 500 },
    })

    render(<OrganizacoesClient />)

    await waitFor(() => {
      expect(screen.getByText("Failed to fetch organizations")).toBeInTheDocument()
    })
  })

  it("opens create organization modal when clicking header button", async () => {
    global.fetch = setupFetchMock({
      "/api/organizations": { data: { organizations: mockOrganizations } },
    })

    render(<OrganizacoesClient />)

    await waitFor(() => {
      expect(screen.getByText("Test Organization")).toBeInTheDocument()
    })

    // Click the "Criar Organizacao" button in the header
    fireEvent.click(screen.getByRole("button", { name: "Criar Organizacao" }))

    await waitFor(() => {
      expect(screen.getByLabelText("Nome da Organizacao")).toBeInTheDocument()
    })
  })

  it("opens organization details and shows members", async () => {
    global.fetch = setupFetchMock({
      "/api/organizations/org-1/members": { data: { members: mockMembers } },
      "/api/organizations/org-1": { 
        data: { 
          organization: {
            ...mockOrganizations[0],
            memberCount: 2,
            collectionsCount: 3,
            userRole: "owner",
          }
        } 
      },
      "/api/organizations": { data: { organizations: mockOrganizations } },
    })

    render(<OrganizacoesClient />)

    await waitFor(() => {
      expect(screen.getByText("Test Organization")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText("Test Organization"))

    await waitFor(() => {
      // Check for members section header
      expect(screen.getByRole("heading", { name: "Membros" })).toBeInTheDocument()
      expect(screen.getByText("Test User")).toBeInTheDocument()
      expect(screen.getByText("Other User")).toBeInTheDocument()
    })
  })

  it("shows add member button for owners in organization details", async () => {
    global.fetch = setupFetchMock({
      "/api/organizations/org-1/members": { data: { members: mockMembers } },
      "/api/organizations/org-1": { 
        data: { 
          organization: {
            ...mockOrganizations[0],
            memberCount: 2,
            collectionsCount: 3,
            userRole: "owner",
          }
        } 
      },
      "/api/organizations": { data: { organizations: mockOrganizations } },
    })

    render(<OrganizacoesClient />)

    await waitFor(() => {
      expect(screen.getByText("Test Organization")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText("Test Organization"))

    // Wait for organization details modal to open and show the add member button
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Adicionar Membro" })).toBeInTheDocument()
    })
  })

  it("displays correct role badges", async () => {
    global.fetch = setupFetchMock({
      "/api/organizations/org-1/members": { data: { members: mockMembers } },
      "/api/organizations/org-1": { 
        data: { 
          organization: {
            ...mockOrganizations[0],
            memberCount: 2,
            collectionsCount: 3,
            userRole: "owner",
          }
        } 
      },
      "/api/organizations": { data: { organizations: mockOrganizations } },
    })

    render(<OrganizacoesClient />)

    await waitFor(() => {
      expect(screen.getByText("Test Organization")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText("Test Organization"))

    await waitFor(() => {
      const donoBadges = screen.getAllByText("Dono")
      expect(donoBadges.length).toBeGreaterThan(0)
    })
  })

  it("shows delete button only for owners", async () => {
    global.fetch = setupFetchMock({
      "/api/organizations/org-1/members": { data: { members: mockMembers } },
      "/api/organizations/org-1": { 
        data: { 
          organization: {
            ...mockOrganizations[0],
            memberCount: 2,
            collectionsCount: 3,
            userRole: "owner",
          }
        } 
      },
      "/api/organizations": { data: { organizations: mockOrganizations } },
    })

    render(<OrganizacoesClient />)

    await waitFor(() => {
      expect(screen.getByText("Test Organization")).toBeInTheDocument()
    })

    // Click on org where user is owner
    fireEvent.click(screen.getByText("Test Organization"))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Excluir" })).toBeInTheDocument()
    })
  })

  it("closes create modal when cancel is clicked", async () => {
    global.fetch = setupFetchMock({
      "/api/organizations": { data: { organizations: mockOrganizations } },
    })

    render(<OrganizacoesClient />)

    await waitFor(() => {
      expect(screen.getByText("Test Organization")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "Criar Organizacao" }))

    await waitFor(() => {
      expect(screen.getByLabelText("Nome da Organizacao")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))

    await waitFor(() => {
      expect(screen.queryByLabelText("Nome da Organizacao")).not.toBeInTheDocument()
    })
  })

  it("redirects to login on 401 response", async () => {
    global.fetch = setupFetchMock({
      "/api/organizations": { data: { error: "Unauthorized" }, ok: false, status: 401 },
    })

    render(<OrganizacoesClient />)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login?redirect=/organizacoes")
    })
  })
})
