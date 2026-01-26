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
}

const mockAdminUser = {
  id: "admin-123",
  email: "admin@example.com",
  name: "Admin User",
  isAdmin: true,
}

const mockSession = {
  user: mockUser,
  session: {
    id: "session-123",
    userId: mockUser.id,
    token: "test-token",
    expiresAt: new Date(Date.now() + 86400000),
  },
}

const mockAdminSession = {
  user: mockAdminUser,
  session: {
    id: "session-456",
    userId: mockAdminUser.id,
    token: "admin-token",
    expiresAt: new Date(Date.now() + 86400000),
  },
}

// Mock plan data
const mockPlan = {
  id: "plan-plus",
  name: "Plus",
  slug: "plus",
  description: "Premium plan",
  priceInCents: 2000,
  isActive: true,
  limits: {
    collectionsLimit: null,
    listingsPerCollection: null,
    aiParsesPerMonth: null,
    canShare: true,
    canCreateOrg: true,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockInactivePlan = {
  ...mockPlan,
  id: "plan-inactive",
  slug: "inactive",
  isActive: false,
}

// Mock subscription data
const mockSubscription = {
  id: "sub-123",
  userId: mockUser.id,
  planId: mockPlan.id,
  status: "active" as const,
  startsAt: new Date(),
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  grantedBy: mockAdminUser.id,
  notes: "Test subscription",
  createdAt: new Date(),
  updatedAt: new Date(),
}

// Mock getServerSession
vi.mock("@/lib/auth-server", () => ({
  getServerSession: vi.fn(),
}))

// Mock database
const mockDbSelect = vi.fn()
const mockDbInsert = vi.fn()
const mockDbUpdate = vi.fn()

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => ({
    select: mockDbSelect,
    insert: mockDbInsert,
    update: mockDbUpdate,
  })),
  subscriptions: { userId: "userId", planId: "planId", status: "status", id: "id" },
  plans: { id: "id" },
  users: { id: "id" },
}))

describe("Subscriptions API", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe("GET /api/subscriptions", () => {
    it("returns 401 when not authenticated", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { GET } = await import("./route")
      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe("Unauthorized")
    })

    it("returns null when user has no active subscription", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      })

      const { GET } = await import("./route")
      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.subscription).toBeNull()
      expect(json.plan).toBeNull()
    })

    it("returns subscription with plan details when user has active subscription", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  { subscription: mockSubscription, plan: mockPlan },
                ]),
              }),
            }),
          }),
        }),
      })

      const { GET } = await import("./route")
      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.subscription).toBeDefined()
      expect(json.subscription.id).toBe(mockSubscription.id)
      expect(json.plan).toBeDefined()
      expect(json.plan.id).toBe(mockPlan.id)
    })
  })

  describe("POST /api/subscriptions", () => {
    it("returns 401 when not authenticated", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { POST } = await import("./route")
      const request = new NextRequest("http://localhost/api/subscriptions", {
        method: "POST",
        body: JSON.stringify({
          userId: mockUser.id,
          planId: mockPlan.id,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe("Unauthorized")
    })

    it("returns 403 when non-admin tries to create subscription", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { POST } = await import("./route")
      const request = new NextRequest("http://localhost/api/subscriptions", {
        method: "POST",
        body: JSON.stringify({
          userId: mockUser.id,
          planId: mockPlan.id,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.error).toBe("Only admins can create subscriptions")
    })

    it("returns 400 when required fields are missing", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockAdminSession)

      const { POST } = await import("./route")
      const request = new NextRequest("http://localhost/api/subscriptions", {
        method: "POST",
        body: JSON.stringify({ userId: mockUser.id }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe("userId, planId, and expiresAt are required")
    })

    it("returns 404 when user not found", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockAdminSession)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })

      const { POST } = await import("./route")
      const request = new NextRequest("http://localhost/api/subscriptions", {
        method: "POST",
        body: JSON.stringify({
          userId: "non-existent-user",
          planId: mockPlan.id,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toBe("User not found")
    })

    it("returns 404 when plan not found", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockAdminSession)

      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockUser]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        })

      const { POST } = await import("./route")
      const request = new NextRequest("http://localhost/api/subscriptions", {
        method: "POST",
        body: JSON.stringify({
          userId: mockUser.id,
          planId: "non-existent-plan",
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toBe("Plan not found")
    })

    it("returns 400 when plan is inactive", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockAdminSession)

      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockUser]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockInactivePlan]),
          }),
        })

      const { POST } = await import("./route")
      const request = new NextRequest("http://localhost/api/subscriptions", {
        method: "POST",
        body: JSON.stringify({
          userId: mockUser.id,
          planId: mockInactivePlan.id,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe("Cannot create subscription for inactive plan")
    })

    it("creates subscription successfully", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockAdminSession)

      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockUser]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockPlan]),
          }),
        })

      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })

      mockDbInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockSubscription]),
        }),
      })

      const { POST } = await import("./route")
      const request = new NextRequest("http://localhost/api/subscriptions", {
        method: "POST",
        body: JSON.stringify({
          userId: mockUser.id,
          planId: mockPlan.id,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          notes: "Test subscription",
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(201)
      expect(json.subscription).toBeDefined()
      expect(json.subscription.id).toBe(mockSubscription.id)
    })

    it("expires existing active subscriptions when creating new one", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockAdminSession)

      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockUser]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockPlan]),
          }),
        })

      const mockUpdateSet = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      })

      mockDbUpdate.mockReturnValue({
        set: mockUpdateSet,
      })

      mockDbInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockSubscription]),
        }),
      })

      const { POST } = await import("./route")
      const request = new NextRequest("http://localhost/api/subscriptions", {
        method: "POST",
        body: JSON.stringify({
          userId: mockUser.id,
          planId: mockPlan.id,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      })

      await POST(request)

      expect(mockDbUpdate).toHaveBeenCalled()
      expect(mockUpdateSet).toHaveBeenCalledWith({ status: "expired" })
    })

    it("includes grantedBy field from admin session", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockAdminSession)

      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockUser]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockPlan]),
          }),
        })

      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })

      const mockInsertValues = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockSubscription]),
      })

      mockDbInsert.mockReturnValue({
        values: mockInsertValues,
      })

      const { POST } = await import("./route")
      const request = new NextRequest("http://localhost/api/subscriptions", {
        method: "POST",
        body: JSON.stringify({
          userId: mockUser.id,
          planId: mockPlan.id,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      })

      await POST(request)

      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          grantedBy: mockAdminUser.id,
        })
      )
    })
  })
})
