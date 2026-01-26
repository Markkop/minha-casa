import { describe, it, expect, vi, beforeEach } from "vitest"

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
const mockPlans = [
  {
    id: "plan-1",
    name: "Free",
    slug: "free",
    description: "Basic plan",
    priceInCents: 0,
    isActive: true,
    limits: {
      collectionsLimit: 3,
      listingsPerCollection: 25,
      aiParsesPerMonth: 5,
      canShare: false,
      canCreateOrg: false,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "plan-2",
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
  },
  {
    id: "plan-3",
    name: "Deprecated",
    slug: "deprecated",
    description: "Old plan",
    priceInCents: 1000,
    isActive: false,
    limits: {
      collectionsLimit: 5,
      listingsPerCollection: 50,
      aiParsesPerMonth: 10,
      canShare: true,
      canCreateOrg: false,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

// Mock getServerSession
vi.mock("@/lib/auth-server", () => ({
  getServerSession: vi.fn(),
}))

// Mock database
const mockDbSelect = vi.fn()

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => ({
    select: mockDbSelect,
  })),
  plans: { id: "id", isActive: "isActive", priceInCents: "priceInCents" },
}))

describe("Plans API", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe("GET /api/plans", () => {
    it("returns only active plans for unauthenticated users", async () => {
      const activePlans = mockPlans.filter((p) => p.isActive)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(activePlans),
          }),
        }),
      })

      const { GET } = await import("./route")
      const request = new Request("http://localhost/api/plans")
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.plans).toHaveLength(2)
      expect(json.plans.every((p: { isActive: boolean }) => p.isActive)).toBe(true)
    })

    it("returns only active plans for regular users", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const activePlans = mockPlans.filter((p) => p.isActive)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(activePlans),
          }),
        }),
      })

      const { GET } = await import("./route")
      const request = new Request("http://localhost/api/plans")
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.plans).toHaveLength(2)
    })

    it("returns 403 when non-admin tries to get inactive plans", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { GET } = await import("./route")
      const request = new Request("http://localhost/api/plans?includeInactive=true")
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.error).toBe("Only admins can view inactive plans")
    })

    it("returns all plans including inactive for admin users", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockAdminSession)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(mockPlans),
        }),
      })

      const { GET } = await import("./route")
      const request = new Request("http://localhost/api/plans?includeInactive=true")
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.plans).toHaveLength(3)
      expect(json.plans.some((p: { isActive: boolean }) => !p.isActive)).toBe(true)
    })

    it("returns plans ordered by price", async () => {
      const orderedPlans = [...mockPlans]
        .filter((p) => p.isActive)
        .sort((a, b) => a.priceInCents - b.priceInCents)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(orderedPlans),
          }),
        }),
      })

      const { GET } = await import("./route")
      const request = new Request("http://localhost/api/plans")
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.plans[0].priceInCents).toBeLessThanOrEqual(json.plans[1].priceInCents)
    })

    it("returns plan with limits information", async () => {
      const activePlans = mockPlans.filter((p) => p.isActive)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(activePlans),
          }),
        }),
      })

      const { GET } = await import("./route")
      const request = new Request("http://localhost/api/plans")
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      const freePlan = json.plans.find((p: { slug: string }) => p.slug === "free")
      expect(freePlan.limits).toBeDefined()
      expect(freePlan.limits.collectionsLimit).toBe(3)
      expect(freePlan.limits.canShare).toBe(false)
    })
  })
})
