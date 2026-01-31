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
    createdAt: new Date(),
    updatedAt: new Date(),
  },
}

// Mock addon data
const mockAddon = {
  id: "addon-1",
  name: "Risco de Enchente",
  slug: "flood",
  description: "Análise de risco de enchente",
  createdAt: new Date(),
}

const mockUserAddon = {
  id: "user-addon-1",
  userId: mockUser.id,
  addonSlug: "flood",
  grantedAt: new Date(),
  grantedBy: mockAdminUser.id,
  enabled: true,
  expiresAt: null,
}

// Mock auth-server
vi.mock("@/lib/auth-server", () => ({
  getServerSession: vi.fn(),
  requireAuth: vi.fn(),
  requireAdmin: vi.fn(),
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
  users: { id: "id", email: "email", name: "name", isAdmin: "isAdmin" },
  userAddons: {
    id: "id",
    userId: "userId",
    addonSlug: "addonSlug",
    grantedAt: "grantedAt",
    grantedBy: "grantedBy",
    enabled: "enabled",
    expiresAt: "expiresAt",
  },
  addons: { id: "id", slug: "slug", name: "name", description: "description" },
}))

describe("Admin User Addons API", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe("GET /api/admin/users/[userId]/addons", () => {
    it("returns 401 when not authenticated", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockRejectedValue(new Error("Unauthorized"))

      const { GET } = await import("./route")
      const request = new NextRequest(
        "http://localhost/api/admin/users/user-123/addons"
      )
      const response = await GET(request, {
        params: Promise.resolve({ userId: "user-123" }),
      })
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe("Unauthorized")
    })

    it("returns 403 when non-admin tries to access", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockRejectedValue(
        new Error("Forbidden: Admin access required")
      )

      const { GET } = await import("./route")
      const request = new NextRequest(
        "http://localhost/api/admin/users/user-123/addons"
      )
      const response = await GET(request, {
        params: Promise.resolve({ userId: "user-123" }),
      })
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

      const { GET } = await import("./route")
      const request = new NextRequest(
        "http://localhost/api/admin/users/non-existent/addons"
      )
      const response = await GET(request, {
        params: Promise.resolve({ userId: "non-existent" }),
      })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toBe("User not found")
    })

    it("returns user addons successfully", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      // First call: get user
      // Second call: get user addons
      // Third call: get addon details
      // Fourth call: get admins
      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { id: mockUser.id, email: mockUser.email, name: mockUser.name },
            ]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockUserAddon]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockResolvedValue([mockAddon]),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockAdminUser]),
          }),
        })

      const { GET } = await import("./route")
      const request = new NextRequest(
        `http://localhost/api/admin/users/${mockUser.id}/addons`
      )
      const response = await GET(request, {
        params: Promise.resolve({ userId: mockUser.id }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.user.id).toBe(mockUser.id)
      expect(json.addons).toHaveLength(1)
      expect(json.addons[0].addonSlug).toBe("flood")
      expect(json.addons[0].addon.name).toBe("Risco de Enchente")
      expect(json.addons[0].grantedByUser.id).toBe(mockAdminUser.id)
    })

    it("returns empty addons array when user has no addons", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { id: mockUser.id, email: mockUser.email, name: mockUser.name },
            ]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockAdminUser]),
          }),
        })

      const { GET } = await import("./route")
      const request = new NextRequest(
        `http://localhost/api/admin/users/${mockUser.id}/addons`
      )
      const response = await GET(request, {
        params: Promise.resolve({ userId: mockUser.id }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.user.id).toBe(mockUser.id)
      expect(json.addons).toHaveLength(0)
    })
  })

  describe("POST /api/admin/users/[userId]/addons", () => {
    it("returns 401 when not authenticated", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockRejectedValue(new Error("Unauthorized"))

      const { POST } = await import("./route")
      const request = new NextRequest(
        "http://localhost/api/admin/users/user-123/addons",
        {
          method: "POST",
          body: JSON.stringify({ addonSlug: "flood" }),
        }
      )
      const response = await POST(request, {
        params: Promise.resolve({ userId: "user-123" }),
      })
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe("Unauthorized")
    })

    it("returns 403 when non-admin tries to access", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockRejectedValue(
        new Error("Forbidden: Admin access required")
      )

      const { POST } = await import("./route")
      const request = new NextRequest(
        "http://localhost/api/admin/users/user-123/addons",
        {
          method: "POST",
          body: JSON.stringify({ addonSlug: "flood" }),
        }
      )
      const response = await POST(request, {
        params: Promise.resolve({ userId: "user-123" }),
      })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.error).toBe("Forbidden")
    })

    it("returns 400 when addonSlug is missing", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      const { POST } = await import("./route")
      const request = new NextRequest(
        "http://localhost/api/admin/users/user-123/addons",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      )
      const response = await POST(request, {
        params: Promise.resolve({ userId: "user-123" }),
      })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe("addonSlug is required and must be a string")
    })

    it("returns 400 when addonSlug is not a string", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      const { POST } = await import("./route")
      const request = new NextRequest(
        "http://localhost/api/admin/users/user-123/addons",
        {
          method: "POST",
          body: JSON.stringify({ addonSlug: 123 }),
        }
      )
      const response = await POST(request, {
        params: Promise.resolve({ userId: "user-123" }),
      })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe("addonSlug is required and must be a string")
    })

    it("returns 400 when enabled is not a boolean", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      const { POST } = await import("./route")
      const request = new NextRequest(
        "http://localhost/api/admin/users/user-123/addons",
        {
          method: "POST",
          body: JSON.stringify({ addonSlug: "flood", enabled: "yes" }),
        }
      )
      const response = await POST(request, {
        params: Promise.resolve({ userId: "user-123" }),
      })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe("enabled must be a boolean")
    })

    it("returns 400 when expiresAt is invalid date", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      const { POST } = await import("./route")
      const request = new NextRequest(
        "http://localhost/api/admin/users/user-123/addons",
        {
          method: "POST",
          body: JSON.stringify({ addonSlug: "flood", expiresAt: "not-a-date" }),
        }
      )
      const response = await POST(request, {
        params: Promise.resolve({ userId: "user-123" }),
      })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe("expiresAt must be a valid ISO date string")
    })

    it("returns 404 when user not found", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })

      const { POST } = await import("./route")
      const request = new NextRequest(
        "http://localhost/api/admin/users/non-existent/addons",
        {
          method: "POST",
          body: JSON.stringify({ addonSlug: "flood" }),
        }
      )
      const response = await POST(request, {
        params: Promise.resolve({ userId: "non-existent" }),
      })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toBe("User not found")
    })

    it("returns 404 when addon not found", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      // First call: get user (found)
      // Second call: get addon (not found)
      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { id: mockUser.id, email: mockUser.email, name: mockUser.name },
            ]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        })

      const { POST } = await import("./route")
      const request = new NextRequest(
        `http://localhost/api/admin/users/${mockUser.id}/addons`,
        {
          method: "POST",
          body: JSON.stringify({ addonSlug: "non-existent-addon" }),
        }
      )
      const response = await POST(request, {
        params: Promise.resolve({ userId: mockUser.id }),
      })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toBe("Addon not found")
    })

    it("creates new addon grant successfully", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      // First call: get user
      // Second call: get addon
      // Third call: check existing grant
      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { id: mockUser.id, email: mockUser.email, name: mockUser.name },
            ]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockAddon]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        })

      mockDbInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockUserAddon]),
        }),
      })

      const { POST } = await import("./route")
      const request = new NextRequest(
        `http://localhost/api/admin/users/${mockUser.id}/addons`,
        {
          method: "POST",
          body: JSON.stringify({ addonSlug: "flood" }),
        }
      )
      const response = await POST(request, {
        params: Promise.resolve({ userId: mockUser.id }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.userAddon.addonSlug).toBe("flood")
      expect(json.userAddon.addon.name).toBe("Risco de Enchente")
      expect(json.updated).toBe(false)
    })

    it("updates existing addon grant", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      // First call: get user
      // Second call: get addon
      // Third call: check existing grant (found)
      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { id: mockUser.id, email: mockUser.email, name: mockUser.name },
            ]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockAddon]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockUserAddon]),
          }),
        })

      const updatedUserAddon = { ...mockUserAddon, expiresAt, enabled: false }
      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedUserAddon]),
          }),
        }),
      })

      const { POST } = await import("./route")
      const request = new NextRequest(
        `http://localhost/api/admin/users/${mockUser.id}/addons`,
        {
          method: "POST",
          body: JSON.stringify({
            addonSlug: "flood",
            expiresAt: expiresAt.toISOString(),
            enabled: false,
          }),
        }
      )
      const response = await POST(request, {
        params: Promise.resolve({ userId: mockUser.id }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.userAddon.addonSlug).toBe("flood")
      expect(json.userAddon.enabled).toBe(false)
      expect(json.updated).toBe(true)
    })

    it("grants addon with null expiresAt", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { id: mockUser.id, email: mockUser.email, name: mockUser.name },
            ]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockAddon]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        })

      mockDbInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockUserAddon]),
        }),
      })

      const { POST } = await import("./route")
      const request = new NextRequest(
        `http://localhost/api/admin/users/${mockUser.id}/addons`,
        {
          method: "POST",
          body: JSON.stringify({ addonSlug: "flood", expiresAt: null }),
        }
      )
      const response = await POST(request, {
        params: Promise.resolve({ userId: mockUser.id }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.userAddon.expiresAt).toBeNull()
    })
  })
})
