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

// Mock user addon data
const mockUserAddon = {
  id: "user-addon-1",
  userId: mockUser.id,
  addonSlug: "flood",
  grantedAt: new Date(),
  grantedBy: "admin-123",
  enabled: true,
  expiresAt: null,
}

// Mock auth-server
vi.mock("@/lib/auth-server", () => ({
  getServerSession: vi.fn(),
}))

// Mock database operations
const mockSelect = vi.fn()
const mockFrom = vi.fn()
const mockWhere = vi.fn()
const mockLimit = vi.fn()
const mockUpdate = vi.fn()
const mockSet = vi.fn()
const mockReturning = vi.fn()

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => ({
    select: mockSelect,
    update: mockUpdate,
  })),
  userAddons: {
    id: "id",
    userId: "user_id",
    addonSlug: "addon_slug",
    enabled: "enabled",
    grantedAt: "granted_at",
    grantedBy: "granted_by",
    expiresAt: "expires_at",
  },
}))

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ type: "eq", a, b })),
  and: vi.fn((...args) => ({ type: "and", args })),
}))

describe("User Addon Toggle API", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    // Setup default mock chain for select
    mockSelect.mockReturnValue({ from: mockFrom })
    mockFrom.mockReturnValue({ where: mockWhere })
    mockWhere.mockReturnValue({ limit: mockLimit })

    // Setup default mock chain for update
    mockUpdate.mockReturnValue({ set: mockSet })
    mockSet.mockReturnValue({ where: mockWhere })
    mockWhere.mockReturnValue({ limit: mockLimit, returning: mockReturning })
  })

  function createRequest(body: unknown, slug: string = "flood"): {
    request: NextRequest
    params: Promise<{ slug: string }>
  } {
    const request = new NextRequest("http://localhost:3000/api/user/addons/" + slug, {
      method: "PATCH",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
    })
    return {
      request,
      params: Promise.resolve({ slug }),
    }
  }

  describe("PATCH /api/user/addons/[slug]", () => {
    it("returns 401 when not authenticated", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { PATCH } = await import("./route")
      const { request, params } = createRequest({ enabled: false })
      const response = await PATCH(request, { params })
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe("Unauthorized")
    })

    it("returns 400 when enabled field is missing", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { PATCH } = await import("./route")
      const { request, params } = createRequest({})
      const response = await PATCH(request, { params })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe("enabled field must be a boolean")
    })

    it("returns 400 when enabled field is not a boolean", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { PATCH } = await import("./route")
      const { request, params } = createRequest({ enabled: "true" })
      const response = await PATCH(request, { params })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe("enabled field must be a boolean")
    })

    it("returns 400 when body is invalid JSON", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { PATCH } = await import("./route")
      const request = new NextRequest("http://localhost:3000/api/user/addons/flood", {
        method: "PATCH",
        body: "invalid json",
        headers: {
          "Content-Type": "application/json",
        },
      })
      const response = await PATCH(request, { params: Promise.resolve({ slug: "flood" }) })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe("Invalid JSON body")
    })

    it("returns 404 when addon grant not found for user", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      // Return empty array - addon not found
      mockLimit.mockResolvedValue([])

      const { PATCH } = await import("./route")
      const { request, params } = createRequest({ enabled: false })
      const response = await PATCH(request, { params })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toBe("Addon not found for user")
    })

    it("successfully enables an addon", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      // Return existing addon grant
      mockLimit.mockResolvedValue([{ ...mockUserAddon, enabled: false }])
      mockReturning.mockResolvedValue([{ ...mockUserAddon, enabled: true }])

      const { PATCH } = await import("./route")
      const { request, params } = createRequest({ enabled: true })
      const response = await PATCH(request, { params })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.addon.enabled).toBe(true)
      expect(json.addon.addonSlug).toBe("flood")
    })

    it("successfully disables an addon", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      // Return existing addon grant
      mockLimit.mockResolvedValue([mockUserAddon])
      mockReturning.mockResolvedValue([{ ...mockUserAddon, enabled: false }])

      const { PATCH } = await import("./route")
      const { request, params } = createRequest({ enabled: false })
      const response = await PATCH(request, { params })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.addon.enabled).toBe(false)
    })

    it("returns 500 when update fails", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      // Return existing addon grant
      mockLimit.mockResolvedValue([mockUserAddon])
      // Return empty array - update failed
      mockReturning.mockResolvedValue([])

      const { PATCH } = await import("./route")
      const { request, params } = createRequest({ enabled: false })
      const response = await PATCH(request, { params })
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.error).toBe("Failed to update addon")
    })

    it("returns 500 when database throws an error", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      // Simulate database error
      mockLimit.mockRejectedValue(new Error("Database error"))

      const { PATCH } = await import("./route")
      const { request, params } = createRequest({ enabled: false })
      const response = await PATCH(request, { params })
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.error).toBe("Failed to update user addon")
    })

    it("includes addon details in response", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const addonWithExpiry = {
        ...mockUserAddon,
        expiresAt: new Date("2026-12-31"),
      }

      mockLimit.mockResolvedValue([addonWithExpiry])
      mockReturning.mockResolvedValue([{ ...addonWithExpiry, enabled: false }])

      const { PATCH } = await import("./route")
      const { request, params } = createRequest({ enabled: false })
      const response = await PATCH(request, { params })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.addon.id).toBe("user-addon-1")
      expect(json.addon.addonSlug).toBe("flood")
      expect(json.addon.grantedAt).toBeDefined()
      expect(json.addon.expiresAt).toBeDefined()
    })
  })

  describe("DELETE /api/user/addons/[slug]", () => {
    function createDeleteRequest(slug: string = "flood"): {
      request: NextRequest
      params: Promise<{ slug: string }>
    } {
      const request = new NextRequest("http://localhost:3000/api/user/addons/" + slug, {
        method: "DELETE",
      })
      return {
        request,
        params: Promise.resolve({ slug }),
      }
    }

    it("returns 401 when not authenticated", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { DELETE } = await import("./route")
      const { request, params } = createDeleteRequest()
      const response = await DELETE(request, { params })
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe("Unauthorized")
    })

    it("returns 404 when addon grant not found for user", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      // Return empty array - addon not found
      mockLimit.mockResolvedValue([])

      const { DELETE } = await import("./route")
      const { request, params } = createDeleteRequest()
      const response = await DELETE(request, { params })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toBe("Addon not found for user")
    })

    it("successfully revokes an addon", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      // Return existing addon grant
      mockLimit.mockResolvedValue([mockUserAddon])

      // Mock delete operation
      const mockDelete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      })
      const { getDb } = await import("@/lib/db")
      vi.mocked(getDb).mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
        delete: mockDelete,
      } as unknown as ReturnType<typeof getDb>)

      const { DELETE } = await import("./route")
      const { request, params } = createDeleteRequest()
      const response = await DELETE(request, { params })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.message).toBe("Addon 'flood' has been revoked")
      expect(json.revokedGrant.addonSlug).toBe("flood")
    })

    it("returns 500 when database throws an error", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      // Simulate database error
      mockLimit.mockRejectedValue(new Error("Database error"))

      const { DELETE } = await import("./route")
      const { request, params } = createDeleteRequest()
      const response = await DELETE(request, { params })
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.error).toBe("Failed to revoke user addon")
    })
  })
})
