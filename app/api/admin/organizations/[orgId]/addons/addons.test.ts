import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock environment variables
vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test")
vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-key-for-testing-only")

// Mock organization data
const mockOrg = {
  id: "org-123",
  name: "Test Organization",
  slug: "test-org",
  ownerId: "user-123",
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

const mockOrgAddon = {
  id: "org-addon-1",
  organizationId: mockOrg.id,
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
  organizations: { id: "id", name: "name", slug: "slug" },
  organizationAddons: {
    id: "id",
    organizationId: "organizationId",
    addonSlug: "addonSlug",
    grantedAt: "grantedAt",
    grantedBy: "grantedBy",
    enabled: "enabled",
    expiresAt: "expiresAt",
  },
  addons: { id: "id", slug: "slug", name: "name", description: "description" },
}))

describe("Admin Organization Addons API", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe("GET /api/admin/organizations/[orgId]/addons", () => {
    it("returns 401 when not authenticated", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockRejectedValue(new Error("Unauthorized"))

      const { GET } = await import("./route")
      const request = new NextRequest(
        "http://localhost/api/admin/organizations/org-123/addons"
      )
      const response = await GET(request, {
        params: Promise.resolve({ orgId: "org-123" }),
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
        "http://localhost/api/admin/organizations/org-123/addons"
      )
      const response = await GET(request, {
        params: Promise.resolve({ orgId: "org-123" }),
      })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.error).toBe("Forbidden")
    })

    it("returns 404 when organization not found", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })

      const { GET } = await import("./route")
      const request = new NextRequest(
        "http://localhost/api/admin/organizations/non-existent/addons"
      )
      const response = await GET(request, {
        params: Promise.resolve({ orgId: "non-existent" }),
      })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toBe("Organization not found")
    })

    it("returns organization addons successfully", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      // First call: get organization
      // Second call: get organization addons
      // Third call: get addon details
      // Fourth call: get admins
      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { id: mockOrg.id, name: mockOrg.name, slug: mockOrg.slug },
            ]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockOrgAddon]),
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
        `http://localhost/api/admin/organizations/${mockOrg.id}/addons`
      )
      const response = await GET(request, {
        params: Promise.resolve({ orgId: mockOrg.id }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.organization.id).toBe(mockOrg.id)
      expect(json.addons).toHaveLength(1)
      expect(json.addons[0].addonSlug).toBe("flood")
      expect(json.addons[0].addon.name).toBe("Risco de Enchente")
      expect(json.addons[0].grantedByUser.id).toBe(mockAdminUser.id)
    })

    it("returns empty addons array when organization has no addons", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { id: mockOrg.id, name: mockOrg.name, slug: mockOrg.slug },
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
        `http://localhost/api/admin/organizations/${mockOrg.id}/addons`
      )
      const response = await GET(request, {
        params: Promise.resolve({ orgId: mockOrg.id }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.organization.id).toBe(mockOrg.id)
      expect(json.addons).toHaveLength(0)
    })
  })

  describe("POST /api/admin/organizations/[orgId]/addons", () => {
    it("returns 401 when not authenticated", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockRejectedValue(new Error("Unauthorized"))

      const { POST } = await import("./route")
      const request = new NextRequest(
        "http://localhost/api/admin/organizations/org-123/addons",
        {
          method: "POST",
          body: JSON.stringify({ addonSlug: "flood" }),
        }
      )
      const response = await POST(request, {
        params: Promise.resolve({ orgId: "org-123" }),
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
        "http://localhost/api/admin/organizations/org-123/addons",
        {
          method: "POST",
          body: JSON.stringify({ addonSlug: "flood" }),
        }
      )
      const response = await POST(request, {
        params: Promise.resolve({ orgId: "org-123" }),
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
        "http://localhost/api/admin/organizations/org-123/addons",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      )
      const response = await POST(request, {
        params: Promise.resolve({ orgId: "org-123" }),
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
        "http://localhost/api/admin/organizations/org-123/addons",
        {
          method: "POST",
          body: JSON.stringify({ addonSlug: 123 }),
        }
      )
      const response = await POST(request, {
        params: Promise.resolve({ orgId: "org-123" }),
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
        "http://localhost/api/admin/organizations/org-123/addons",
        {
          method: "POST",
          body: JSON.stringify({ addonSlug: "flood", enabled: "yes" }),
        }
      )
      const response = await POST(request, {
        params: Promise.resolve({ orgId: "org-123" }),
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
        "http://localhost/api/admin/organizations/org-123/addons",
        {
          method: "POST",
          body: JSON.stringify({ addonSlug: "flood", expiresAt: "not-a-date" }),
        }
      )
      const response = await POST(request, {
        params: Promise.resolve({ orgId: "org-123" }),
      })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe("expiresAt must be a valid ISO date string")
    })

    it("returns 404 when organization not found", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })

      const { POST } = await import("./route")
      const request = new NextRequest(
        "http://localhost/api/admin/organizations/non-existent/addons",
        {
          method: "POST",
          body: JSON.stringify({ addonSlug: "flood" }),
        }
      )
      const response = await POST(request, {
        params: Promise.resolve({ orgId: "non-existent" }),
      })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toBe("Organization not found")
    })

    it("returns 404 when addon not found", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      // First call: get organization (found)
      // Second call: get addon (not found)
      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { id: mockOrg.id, name: mockOrg.name, slug: mockOrg.slug },
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
        `http://localhost/api/admin/organizations/${mockOrg.id}/addons`,
        {
          method: "POST",
          body: JSON.stringify({ addonSlug: "non-existent-addon" }),
        }
      )
      const response = await POST(request, {
        params: Promise.resolve({ orgId: mockOrg.id }),
      })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toBe("Addon not found")
    })

    it("creates new addon grant successfully", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      // First call: get organization
      // Second call: get addon
      // Third call: check existing grant
      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { id: mockOrg.id, name: mockOrg.name, slug: mockOrg.slug },
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
          returning: vi.fn().mockResolvedValue([mockOrgAddon]),
        }),
      })

      const { POST } = await import("./route")
      const request = new NextRequest(
        `http://localhost/api/admin/organizations/${mockOrg.id}/addons`,
        {
          method: "POST",
          body: JSON.stringify({ addonSlug: "flood" }),
        }
      )
      const response = await POST(request, {
        params: Promise.resolve({ orgId: mockOrg.id }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.organizationAddon.addonSlug).toBe("flood")
      expect(json.organizationAddon.addon.name).toBe("Risco de Enchente")
      expect(json.updated).toBe(false)
    })

    it("updates existing addon grant", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      // First call: get organization
      // Second call: get addon
      // Third call: check existing grant (found)
      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { id: mockOrg.id, name: mockOrg.name, slug: mockOrg.slug },
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
            where: vi.fn().mockResolvedValue([mockOrgAddon]),
          }),
        })

      const updatedOrgAddon = { ...mockOrgAddon, expiresAt, enabled: false }
      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedOrgAddon]),
          }),
        }),
      })

      const { POST } = await import("./route")
      const request = new NextRequest(
        `http://localhost/api/admin/organizations/${mockOrg.id}/addons`,
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
        params: Promise.resolve({ orgId: mockOrg.id }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.organizationAddon.addonSlug).toBe("flood")
      expect(json.organizationAddon.enabled).toBe(false)
      expect(json.updated).toBe(true)
    })

    it("grants addon with null expiresAt", async () => {
      const { requireAdmin } = await import("@/lib/auth-server")
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { id: mockOrg.id, name: mockOrg.name, slug: mockOrg.slug },
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
          returning: vi.fn().mockResolvedValue([mockOrgAddon]),
        }),
      })

      const { POST } = await import("./route")
      const request = new NextRequest(
        `http://localhost/api/admin/organizations/${mockOrg.id}/addons`,
        {
          method: "POST",
          body: JSON.stringify({ addonSlug: "flood", expiresAt: null }),
        }
      )
      const response = await POST(request, {
        params: Promise.resolve({ orgId: mockOrg.id }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.organizationAddon.expiresAt).toBeNull()
    })
  })
})
