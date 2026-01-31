import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock environment variables
vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test")
vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-key-for-testing-only")

// Mock user data
const mockUser = {
  id: "user-123",
  email: "test@example.com",
  name: "Test User",
  isAdmin: false,
  emailVerified: true,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockUser2 = {
  id: "user-456",
  email: "other@example.com",
  name: "Other User",
  isAdmin: false,
  emailVerified: true,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockSession = {
  user: mockUser,
  session: {
    id: "session-123",
    userId: mockUser.id,
    token: "test-token",
    expiresAt: new Date(Date.now() + 86400000),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
}

const mockSession2 = {
  user: mockUser2,
  session: {
    id: "session-456",
    userId: mockUser2.id,
    token: "test-token-2",
    expiresAt: new Date(Date.now() + 86400000),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
}

// Mock organization data
const mockOrganization = {
  id: "org-123",
  name: "Test Organization",
  slug: "test-organization",
  ownerId: mockUser.id,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockMembership = {
  id: "member-123",
  orgId: mockOrganization.id,
  userId: mockUser.id,
  role: "owner" as const,
  joinedAt: new Date(),
}

// Mock addon data
const mockOrgAddons = [
  {
    id: "addon-grant-1",
    organizationId: mockOrganization.id,
    addonSlug: "flood-risk",
    grantedAt: new Date(),
    grantedBy: "admin-123",
    enabled: true,
    expiresAt: null,
  },
  {
    id: "addon-grant-2",
    organizationId: mockOrganization.id,
    addonSlug: "advanced-analytics",
    grantedAt: new Date(),
    grantedBy: "admin-123",
    enabled: true,
    expiresAt: new Date(Date.now() + 86400000 * 30), // 30 days from now
  },
]

// Mock getServerSession
vi.mock("@/lib/auth-server", () => ({
  getServerSession: vi.fn(),
}))

// Mock getAllOrgGrantedAddons
vi.mock("@/lib/addons", () => ({
  getAllOrgGrantedAddons: vi.fn(),
}))

// Mock database
const mockDbSelect = vi.fn()

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => ({
    select: mockDbSelect,
  })),
  organizations: { id: "id" },
  organizationMembers: { orgId: "orgId", userId: "userId" },
}))

describe("Organization Addons API", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe("GET /api/organizations/[id]/addons", () => {
    it("returns 401 when not authenticated", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { GET } = await import("./route")
      const request = new NextRequest("http://localhost/api/organizations/org-123/addons")

      const response = await GET(request, { params: Promise.resolve({ id: "org-123" }) })
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe("Unauthorized")
    })

    it("returns 404 when organization not found", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })

      const { GET } = await import("./route")
      const request = new NextRequest("http://localhost/api/organizations/org-not-found/addons")

      const response = await GET(request, { params: Promise.resolve({ id: "org-not-found" }) })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toBe("Organization not found")
    })

    it("returns 403 when user is not a member", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession2)

      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockOrganization]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]), // No membership
          }),
        })

      const { GET } = await import("./route")
      const request = new NextRequest("http://localhost/api/organizations/org-123/addons")

      const response = await GET(request, { params: Promise.resolve({ id: "org-123" }) })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.error).toBe("You are not a member of this organization")
    })

    it("returns organization addons for a member", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { getAllOrgGrantedAddons } = await import("@/lib/addons")
      vi.mocked(getAllOrgGrantedAddons).mockResolvedValue(mockOrgAddons)

      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockOrganization]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockMembership]),
          }),
        })

      const { GET } = await import("./route")
      const request = new NextRequest("http://localhost/api/organizations/org-123/addons")

      const response = await GET(request, { params: Promise.resolve({ id: "org-123" }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.addons).toHaveLength(2)
      expect(json.addons[0].addonSlug).toBe("flood-risk")
      expect(json.addons[1].addonSlug).toBe("advanced-analytics")
    })

    it("returns empty array when organization has no addons", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { getAllOrgGrantedAddons } = await import("@/lib/addons")
      vi.mocked(getAllOrgGrantedAddons).mockResolvedValue([])

      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockOrganization]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockMembership]),
          }),
        })

      const { GET } = await import("./route")
      const request = new NextRequest("http://localhost/api/organizations/org-123/addons")

      const response = await GET(request, { params: Promise.resolve({ id: "org-123" }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.addons).toHaveLength(0)
    })

    it("handles database errors gracefully", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error("Database error")),
        }),
      })

      const { GET } = await import("./route")
      const request = new NextRequest("http://localhost/api/organizations/org-123/addons")

      const response = await GET(request, { params: Promise.resolve({ id: "org-123" }) })
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.error).toBe("Failed to fetch organization addons")
    })

    it("returns all addons including disabled ones for management", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const addonsWithDisabled = [
        ...mockOrgAddons,
        {
          id: "addon-grant-3",
          organizationId: mockOrganization.id,
          addonSlug: "disabled-feature",
          grantedAt: new Date(),
          grantedBy: "admin-123",
          enabled: false, // Disabled addon should be included
          expiresAt: null,
        },
      ]

      const { getAllOrgGrantedAddons } = await import("@/lib/addons")
      vi.mocked(getAllOrgGrantedAddons).mockResolvedValue(addonsWithDisabled)

      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockOrganization]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockMembership]),
          }),
        })

      const { GET } = await import("./route")
      const request = new NextRequest("http://localhost/api/organizations/org-123/addons")

      const response = await GET(request, { params: Promise.resolve({ id: "org-123" }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.addons).toHaveLength(3)
      
      const disabledAddon = json.addons.find((a: { addonSlug: string }) => a.addonSlug === "disabled-feature")
      expect(disabledAddon).toBeDefined()
      expect(disabledAddon.enabled).toBe(false)
    })
  })
})
