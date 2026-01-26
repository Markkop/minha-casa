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

const mockExpiredSubscription = {
  ...mockSubscription,
  id: "sub-expired",
  status: "expired" as const,
  expiresAt: new Date(Date.now() - 1000), // Already expired
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
  users: { id: "id", email: "email", isAdmin: "isAdmin", createdAt: "createdAt", name: "name" },
  subscriptions: { 
    userId: "userId", 
    status: "status", 
    id: "id", 
    planId: "planId",
    expiresAt: "expiresAt",
    grantedBy: "grantedBy",
    notes: "notes",
    createdAt: "createdAt",
  },
  plans: { id: "id", name: "name", slug: "slug", isActive: "isActive" },
}))

describe("Admin Subscriptions API", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe("GET /api/admin/subscriptions/[id]", () => {
    it("returns 401 when not authenticated", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockRejectedValue(new Error("Unauthorized"))

      const { GET } = await import("./[id]/route")
      const request = new NextRequest("http://localhost/api/admin/subscriptions/sub-123")
      const response = await GET(request, { params: Promise.resolve({ id: "sub-123" }) })
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe("Unauthorized")
    })

    it("returns 403 when non-admin tries to access", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockRejectedValue(new Error("Forbidden: Admin access required"))

      const { GET } = await import("./[id]/route")
      const request = new NextRequest("http://localhost/api/admin/subscriptions/sub-123")
      const response = await GET(request, { params: Promise.resolve({ id: "sub-123" }) })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.error).toBe("Forbidden")
    })

    it("returns 404 when subscription not found", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }),
      })

      const { GET } = await import("./[id]/route")
      const request = new NextRequest("http://localhost/api/admin/subscriptions/non-existent")
      const response = await GET(request, { params: Promise.resolve({ id: "non-existent" }) })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toBe("Subscription not found")
    })
  })

  describe("PATCH /api/admin/subscriptions/[id]", () => {
    it("returns 401 when not authenticated", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockRejectedValue(new Error("Unauthorized"))

      const { PATCH } = await import("./[id]/route")
      const request = new NextRequest("http://localhost/api/admin/subscriptions/sub-123", {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      })
      const response = await PATCH(request, { params: Promise.resolve({ id: "sub-123" }) })
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe("Unauthorized")
    })

    it("returns 403 when non-admin tries to access", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockRejectedValue(new Error("Forbidden: Admin access required"))

      const { PATCH } = await import("./[id]/route")
      const request = new NextRequest("http://localhost/api/admin/subscriptions/sub-123", {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      })
      const response = await PATCH(request, { params: Promise.resolve({ id: "sub-123" }) })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.error).toBe("Forbidden")
    })

    it("returns 400 when no fields provided", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      const { PATCH } = await import("./[id]/route")
      const request = new NextRequest("http://localhost/api/admin/subscriptions/sub-123", {
        method: "PATCH",
        body: JSON.stringify({}),
      })
      const response = await PATCH(request, { params: Promise.resolve({ id: "sub-123" }) })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe("At least one field must be provided (expiresAt, status, notes)")
    })

    it("returns 400 when status is invalid", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      const { PATCH } = await import("./[id]/route")
      const request = new NextRequest("http://localhost/api/admin/subscriptions/sub-123", {
        method: "PATCH",
        body: JSON.stringify({ status: "invalid" }),
      })
      const response = await PATCH(request, { params: Promise.resolve({ id: "sub-123" }) })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe("status must be one of: active, expired, cancelled")
    })

    it("returns 400 when expiresAt is invalid date", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      const { PATCH } = await import("./[id]/route")
      const request = new NextRequest("http://localhost/api/admin/subscriptions/sub-123", {
        method: "PATCH",
        body: JSON.stringify({ expiresAt: "not-a-date" }),
      })
      const response = await PATCH(request, { params: Promise.resolve({ id: "sub-123" }) })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe("expiresAt must be a valid date")
    })

    it("returns 404 when subscription not found", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })

      const { PATCH } = await import("./[id]/route")
      const request = new NextRequest("http://localhost/api/admin/subscriptions/non-existent", {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      })
      const response = await PATCH(request, { params: Promise.resolve({ id: "non-existent" }) })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toBe("Subscription not found")
    })

    it("updates subscription status successfully", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockSubscription]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockPlan]),
          }),
        })

      const cancelledSubscription = { ...mockSubscription, status: "cancelled" }
      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([cancelledSubscription]),
          }),
        }),
      })

      const { PATCH } = await import("./[id]/route")
      const request = new NextRequest(`http://localhost/api/admin/subscriptions/${mockSubscription.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      })
      const response = await PATCH(request, { params: Promise.resolve({ id: mockSubscription.id }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.subscription.status).toBe("cancelled")
    })

    it("extends subscription expiry successfully", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      const newExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days

      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockSubscription]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockPlan]),
          }),
        })

      const extendedSubscription = { ...mockSubscription, expiresAt: newExpiresAt }
      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([extendedSubscription]),
          }),
        }),
      })

      const { PATCH } = await import("./[id]/route")
      const request = new NextRequest(`http://localhost/api/admin/subscriptions/${mockSubscription.id}`, {
        method: "PATCH",
        body: JSON.stringify({ expiresAt: newExpiresAt.toISOString() }),
      })
      const response = await PATCH(request, { params: Promise.resolve({ id: mockSubscription.id }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.subscription).toBeDefined()
    })

    it("updates subscription notes successfully", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      const newNotes = "Payment reference: PIX-12345"

      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockSubscription]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockPlan]),
          }),
        })

      const updatedSubscription = { ...mockSubscription, notes: newNotes }
      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedSubscription]),
          }),
        }),
      })

      const { PATCH } = await import("./[id]/route")
      const request = new NextRequest(`http://localhost/api/admin/subscriptions/${mockSubscription.id}`, {
        method: "PATCH",
        body: JSON.stringify({ notes: newNotes }),
      })
      const response = await PATCH(request, { params: Promise.resolve({ id: mockSubscription.id }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.subscription.notes).toBe(newNotes)
    })
  })

  describe("DELETE /api/admin/subscriptions/[id]", () => {
    it("returns 401 when not authenticated", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockRejectedValue(new Error("Unauthorized"))

      const { DELETE } = await import("./[id]/route")
      const request = new NextRequest("http://localhost/api/admin/subscriptions/sub-123", {
        method: "DELETE",
      })
      const response = await DELETE(request, { params: Promise.resolve({ id: "sub-123" }) })
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe("Unauthorized")
    })

    it("returns 403 when non-admin tries to access", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockRejectedValue(new Error("Forbidden: Admin access required"))

      const { DELETE } = await import("./[id]/route")
      const request = new NextRequest("http://localhost/api/admin/subscriptions/sub-123", {
        method: "DELETE",
      })
      const response = await DELETE(request, { params: Promise.resolve({ id: "sub-123" }) })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.error).toBe("Forbidden")
    })

    it("returns 404 when subscription not found", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })

      const { DELETE } = await import("./[id]/route")
      const request = new NextRequest("http://localhost/api/admin/subscriptions/non-existent", {
        method: "DELETE",
      })
      const response = await DELETE(request, { params: Promise.resolve({ id: "non-existent" }) })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toBe("Subscription not found")
    })

    it("deletes subscription successfully", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockSubscription]),
        }),
      })

      mockDbDelete.mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      })

      const { DELETE } = await import("./[id]/route")
      const request = new NextRequest(`http://localhost/api/admin/subscriptions/${mockSubscription.id}`, {
        method: "DELETE",
      })
      const response = await DELETE(request, { params: Promise.resolve({ id: mockSubscription.id }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.message).toBe("Subscription deleted successfully")
    })
  })
})

describe("Admin Subscriptions User History API", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe("GET /api/admin/subscriptions/user/[userId]", () => {
    it("returns 401 when not authenticated", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockRejectedValue(new Error("Unauthorized"))

      const { GET } = await import("./user/[userId]/route")
      const request = new NextRequest("http://localhost/api/admin/subscriptions/user/user-123")
      const response = await GET(request, { params: Promise.resolve({ userId: "user-123" }) })
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe("Unauthorized")
    })

    it("returns 403 when non-admin tries to access", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockRejectedValue(new Error("Forbidden: Admin access required"))

      const { GET } = await import("./user/[userId]/route")
      const request = new NextRequest("http://localhost/api/admin/subscriptions/user/user-123")
      const response = await GET(request, { params: Promise.resolve({ userId: "user-123" }) })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.error).toBe("Forbidden")
    })

    it("returns 404 when user not found", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })

      const { GET } = await import("./user/[userId]/route")
      const request = new NextRequest("http://localhost/api/admin/subscriptions/user/non-existent")
      const response = await GET(request, { params: Promise.resolve({ userId: "non-existent" }) })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toBe("User not found")
    })

    it("returns user subscription history", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      mockDbSelect
        // First call: get user
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{
              id: mockUser.id,
              email: mockUser.email,
              name: mockUser.name,
            }]),
          }),
        })
        // Second call: get subscriptions
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockResolvedValue([
                  {
                    id: mockSubscription.id,
                    userId: mockSubscription.userId,
                    planId: mockSubscription.planId,
                    status: mockSubscription.status,
                    startsAt: mockSubscription.startsAt,
                    expiresAt: mockSubscription.expiresAt,
                    grantedBy: mockSubscription.grantedBy,
                    notes: mockSubscription.notes,
                    createdAt: mockSubscription.createdAt,
                    updatedAt: mockSubscription.updatedAt,
                    planName: mockPlan.name,
                    planSlug: mockPlan.slug,
                    planPriceInCents: mockPlan.priceInCents,
                  },
                  {
                    id: mockExpiredSubscription.id,
                    userId: mockExpiredSubscription.userId,
                    planId: mockExpiredSubscription.planId,
                    status: mockExpiredSubscription.status,
                    startsAt: mockExpiredSubscription.startsAt,
                    expiresAt: mockExpiredSubscription.expiresAt,
                    grantedBy: mockExpiredSubscription.grantedBy,
                    notes: mockExpiredSubscription.notes,
                    createdAt: mockExpiredSubscription.createdAt,
                    updatedAt: mockExpiredSubscription.updatedAt,
                    planName: mockPlan.name,
                    planSlug: mockPlan.slug,
                    planPriceInCents: mockPlan.priceInCents,
                  },
                ]),
              }),
            }),
          }),
        })
        // Third call: get admins for grantedBy
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockAdminUser]),
          }),
        })

      const { GET } = await import("./user/[userId]/route")
      const request = new NextRequest(`http://localhost/api/admin/subscriptions/user/${mockUser.id}`)
      const response = await GET(request, { params: Promise.resolve({ userId: mockUser.id }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.user).toBeDefined()
      expect(json.user.id).toBe(mockUser.id)
      expect(json.subscriptions).toBeDefined()
      expect(json.subscriptions).toHaveLength(2)
      expect(json.subscriptions[0].status).toBe("active")
      expect(json.subscriptions[1].status).toBe("expired")
    })

    it("returns empty subscriptions array when user has no subscriptions", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      mockDbSelect
        // First call: get user
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{
              id: mockUser.id,
              email: mockUser.email,
              name: mockUser.name,
            }]),
          }),
        })
        // Second call: get subscriptions (empty)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        })
        // Third call: get admins (empty array since no subscriptions)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        })

      const { GET } = await import("./user/[userId]/route")
      const request = new NextRequest(`http://localhost/api/admin/subscriptions/user/${mockUser.id}`)
      const response = await GET(request, { params: Promise.resolve({ userId: mockUser.id }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.user).toBeDefined()
      expect(json.subscriptions).toEqual([])
    })
  })
})
