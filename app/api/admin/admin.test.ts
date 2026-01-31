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
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockAdminUser = {
  id: "admin-123",
  email: "admin@example.com",
  name: "Admin User",
  isAdmin: true,
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

const mockAdminSession = {
  user: mockAdminUser,
  session: {
    id: "session-456",
    userId: mockAdminUser.id,
    token: "admin-token",
    expiresAt: new Date(Date.now() + 86400000),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
}

// Mock plan data
const mockPlan = {
  id: "plan-plus",
  name: "Plus",
  slug: "plus",
}

// Mock subscription
const mockSubscription = {
  id: "sub-123",
  status: "active",
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
}

// Mock auth-server
vi.mock("@/lib/auth-server", () => ({
  getServerSession: vi.fn(),
  requireAuth: vi.fn(),
  requireAdmin: vi.fn(),
}))

// Mock database
const mockDbSelect = vi.fn()
const mockDbUpdate = vi.fn()
const mockDbDelete = vi.fn()

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => ({
    select: mockDbSelect,
    update: mockDbUpdate,
    delete: mockDbDelete,
  })),
  users: { id: "id", email: "email", isAdmin: "isAdmin", createdAt: "createdAt" },
  subscriptions: { userId: "userId", status: "status", id: "id", planId: "planId" },
  plans: { id: "id", name: "name", slug: "slug", isActive: "isActive" },
  collections: { id: "id" },
  listings: { id: "id" },
  sessions: { userId: "userId" },
  accounts: { userId: "userId" },
  organizationMembers: { userId: "userId" },
  organizations: { ownerId: "ownerId" },
}))

describe("Admin Users API", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe("GET /api/admin/users", () => {
    it("returns 401 when not authenticated", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockRejectedValue(new Error("Unauthorized"))

      const { GET } = await import("./users/route")
      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe("Unauthorized")
    })

    it("returns 403 when non-admin tries to access", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockRejectedValue(new Error("Forbidden: Admin access required"))

      const { GET } = await import("./users/route")
      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.error).toBe("Forbidden")
    })

    it("returns users list for admin", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([
                {
                  id: mockUser.id,
                  email: mockUser.email,
                  name: mockUser.name,
                  isAdmin: mockUser.isAdmin,
                  emailVerified: mockUser.emailVerified,
                  createdAt: mockUser.createdAt,
                  subscriptionId: mockSubscription.id,
                  subscriptionStatus: mockSubscription.status,
                  subscriptionExpiresAt: mockSubscription.expiresAt,
                  planId: mockPlan.id,
                  planName: mockPlan.name,
                  planSlug: mockPlan.slug,
                },
                {
                  id: mockAdminUser.id,
                  email: mockAdminUser.email,
                  name: mockAdminUser.name,
                  isAdmin: mockAdminUser.isAdmin,
                  emailVerified: mockAdminUser.emailVerified,
                  createdAt: mockAdminUser.createdAt,
                  subscriptionId: null,
                  subscriptionStatus: null,
                  subscriptionExpiresAt: null,
                  planId: null,
                  planName: null,
                  planSlug: null,
                },
              ]),
            }),
          }),
        }),
      })

      const { GET } = await import("./users/route")
      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.users).toHaveLength(2)
      expect(json.users[0].email).toBe(mockUser.email)
      expect(json.users[0].subscription).not.toBeNull()
      expect(json.users[0].subscription.plan.name).toBe(mockPlan.name)
      expect(json.users[1].email).toBe(mockAdminUser.email)
      expect(json.users[1].subscription).toBeNull()
    })
  })

  describe("PATCH /api/admin/users/[userId]", () => {
    it("returns 401 when not authenticated", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockRejectedValue(new Error("Unauthorized"))

      const { PATCH } = await import("./users/[userId]/route")
      const request = new NextRequest("http://localhost/api/admin/users/user-123", {
        method: "PATCH",
        body: JSON.stringify({ isAdmin: true }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ userId: "user-123" }) })
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe("Unauthorized")
    })

    it("returns 403 when non-admin tries to access", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockRejectedValue(new Error("Forbidden: Admin access required"))

      const { PATCH } = await import("./users/[userId]/route")
      const request = new NextRequest("http://localhost/api/admin/users/user-123", {
        method: "PATCH",
        body: JSON.stringify({ isAdmin: true }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ userId: "user-123" }) })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.error).toBe("Forbidden")
    })

    it("returns 400 when no fields provided", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      const { PATCH } = await import("./users/[userId]/route")
      const request = new NextRequest("http://localhost/api/admin/users/user-123", {
        method: "PATCH",
        body: JSON.stringify({}),
      })

      const response = await PATCH(request, { params: Promise.resolve({ userId: "user-123" }) })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe("At least one field must be provided (isAdmin, name)")
    })

    it("returns 400 when isAdmin is not a boolean", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      const { PATCH } = await import("./users/[userId]/route")
      const request = new NextRequest("http://localhost/api/admin/users/user-123", {
        method: "PATCH",
        body: JSON.stringify({ isAdmin: "yes" }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ userId: "user-123" }) })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe("isAdmin must be a boolean")
    })

    it("returns 400 when name is empty", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      const { PATCH } = await import("./users/[userId]/route")
      const request = new NextRequest("http://localhost/api/admin/users/user-123", {
        method: "PATCH",
        body: JSON.stringify({ name: "   " }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ userId: "user-123" }) })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe("name cannot be empty")
    })

    it("returns 400 when name exceeds 255 characters", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      const { PATCH } = await import("./users/[userId]/route")
      const request = new NextRequest("http://localhost/api/admin/users/user-123", {
        method: "PATCH",
        body: JSON.stringify({ name: "a".repeat(256) }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ userId: "user-123" }) })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe("name cannot exceed 255 characters")
    })

    it("returns 400 when admin tries to remove own admin status", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      const { PATCH } = await import("./users/[userId]/route")
      const request = new NextRequest(`http://localhost/api/admin/users/${mockAdminUser.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isAdmin: false }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ userId: mockAdminUser.id }) })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe("Cannot remove your own admin status")
    })

    it("returns 404 when user not found", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })

      const { PATCH } = await import("./users/[userId]/route")
      const request = new NextRequest("http://localhost/api/admin/users/non-existent", {
        method: "PATCH",
        body: JSON.stringify({ isAdmin: true }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ userId: "non-existent" }) })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toBe("User not found")
    })

    it("updates user admin status successfully", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockUser]),
        }),
      })

      const updatedUser = { ...mockUser, isAdmin: true }
      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedUser]),
          }),
        }),
      })

      const { PATCH } = await import("./users/[userId]/route")
      const request = new NextRequest(`http://localhost/api/admin/users/${mockUser.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isAdmin: true }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ userId: mockUser.id }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.user.isAdmin).toBe(true)
    })

    it("updates user name successfully", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockUser]),
        }),
      })

      const updatedUser = { ...mockUser, name: "New Name" }
      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedUser]),
          }),
        }),
      })

      const { PATCH } = await import("./users/[userId]/route")
      const request = new NextRequest(`http://localhost/api/admin/users/${mockUser.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "New Name" }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ userId: mockUser.id }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.user.name).toBe("New Name")
    })
  })

  describe("DELETE /api/admin/users/[userId]", () => {
    it("returns 401 when not authenticated", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockRejectedValue(new Error("Unauthorized"))

      const { DELETE } = await import("./users/[userId]/route")
      const request = new NextRequest("http://localhost/api/admin/users/user-123", {
        method: "DELETE",
      })

      const response = await DELETE(request, { params: Promise.resolve({ userId: "user-123" }) })
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe("Unauthorized")
    })

    it("returns 403 when non-admin tries to access", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockRejectedValue(new Error("Forbidden: Admin access required"))

      const { DELETE } = await import("./users/[userId]/route")
      const request = new NextRequest("http://localhost/api/admin/users/user-123", {
        method: "DELETE",
      })

      const response = await DELETE(request, { params: Promise.resolve({ userId: "user-123" }) })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.error).toBe("Forbidden")
    })

    it("returns 400 when admin tries to delete themselves", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      const { DELETE } = await import("./users/[userId]/route")
      const request = new NextRequest(`http://localhost/api/admin/users/${mockAdminUser.id}`, {
        method: "DELETE",
      })

      const response = await DELETE(request, { params: Promise.resolve({ userId: mockAdminUser.id }) })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe("Cannot delete your own account")
    })

    it("returns 404 when user not found", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })

      const { DELETE } = await import("./users/[userId]/route")
      const request = new NextRequest("http://localhost/api/admin/users/non-existent", {
        method: "DELETE",
      })

      const response = await DELETE(request, { params: Promise.resolve({ userId: "non-existent" }) })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toBe("User not found")
    })

    it("deletes user successfully", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockUser]),
        }),
      })

      mockDbDelete.mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      })

      const { DELETE } = await import("./users/[userId]/route")
      const request = new NextRequest(`http://localhost/api/admin/users/${mockUser.id}`, {
        method: "DELETE",
      })

      const response = await DELETE(request, { params: Promise.resolve({ userId: mockUser.id }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.message).toBe("User deleted successfully")
    })
  })
})

describe("Admin Stats API", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe("GET /api/admin/stats", () => {
    it("returns 401 when not authenticated", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockRejectedValue(new Error("Unauthorized"))

      const { GET } = await import("./stats/route")
      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe("Unauthorized")
    })

    it("returns 403 when non-admin tries to access", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockRejectedValue(new Error("Forbidden: Admin access required"))

      const { GET } = await import("./stats/route")
      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.error).toBe("Forbidden")
    })

    it("returns stats for admin", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      // Mock all the count queries
      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockResolvedValue([{ count: 10 }]),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 5 }]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockResolvedValue([{ count: 20 }]),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockResolvedValue([{ count: 100 }]),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 3 }]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                groupBy: vi.fn().mockResolvedValue([
                  { planName: "Plus", planSlug: "plus", count: 5 },
                ]),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 2 }]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 1 }]),
          }),
        })

      const { GET } = await import("./stats/route")
      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.stats).toBeDefined()
      expect(json.stats.totalUsers).toBe(10)
      expect(json.stats.activeSubscriptions).toBe(5)
      expect(json.stats.totalCollections).toBe(20)
      expect(json.stats.totalListings).toBe(100)
      expect(json.stats.activePlans).toBe(3)
      expect(json.stats.subscriptionsByPlan).toHaveLength(1)
    })
  })
})

// Mock addons data
const mockAddons = [
  {
    id: "addon-1",
    name: "Risco de Enchente",
    slug: "flood",
    description: "Análise de risco de enchente com visualização 3D",
    createdAt: new Date(),
  },
  {
    id: "addon-2",
    name: "Simulador de Financiamento",
    slug: "financiamento",
    description: "Simulador de financiamento imobiliário",
    createdAt: new Date(),
  },
]

// Mock addons module
vi.mock("@/lib/addons", () => ({
  getAvailableAddons: vi.fn(),
}))

describe("Admin Addons API", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe("GET /api/admin/addons", () => {
    it("returns 401 when not authenticated", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockRejectedValue(new Error("Unauthorized"))

      const { GET } = await import("./addons/route")
      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe("Unauthorized")
    })

    it("returns 403 when non-admin tries to access", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockRejectedValue(new Error("Forbidden: Admin access required"))

      const { GET } = await import("./addons/route")
      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.error).toBe("Forbidden")
    })

    it("returns addons list for admin", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      const { getAvailableAddons } = await import("@/lib/addons")
      vi.mocked(getAvailableAddons).mockResolvedValue(mockAddons)

      const { GET } = await import("./addons/route")
      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.addons).toHaveLength(2)
      expect(json.addons[0].slug).toBe("flood")
      expect(json.addons[0].name).toBe("Risco de Enchente")
      expect(json.addons[1].slug).toBe("financiamento")
      expect(json.addons[1].name).toBe("Simulador de Financiamento")
    })

    it("returns empty array when no addons exist", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      const { getAvailableAddons } = await import("@/lib/addons")
      vi.mocked(getAvailableAddons).mockResolvedValue([])

      const { GET } = await import("./addons/route")
      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.addons).toHaveLength(0)
    })

    it("returns 500 when database error occurs", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      const { getAvailableAddons } = await import("@/lib/addons")
      vi.mocked(getAvailableAddons).mockRejectedValue(new Error("Database connection failed"))

      const { GET } = await import("./addons/route")
      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.error).toBe("Failed to fetch addons")
    })
  })
})
