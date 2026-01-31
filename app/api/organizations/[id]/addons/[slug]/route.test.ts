import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock environment variables
vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test")
vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-key-for-testing-only")

// Mock user data
const mockOwner = {
  id: "user-owner",
  email: "owner@example.com",
  name: "Owner User",
  isAdmin: false,
  emailVerified: true,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockAdmin = {
  id: "user-admin",
  email: "admin@example.com",
  name: "Admin User",
  isAdmin: false,
  emailVerified: true,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockMember = {
  id: "user-member",
  email: "member@example.com",
  name: "Member User",
  isAdmin: false,
  emailVerified: true,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockNonMember = {
  id: "user-nonmember",
  email: "nonmember@example.com",
  name: "Non Member User",
  isAdmin: false,
  emailVerified: true,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const createSession = (user: typeof mockOwner) => ({
  user,
  session: {
    id: `session-${user.id}`,
    userId: user.id,
    token: `token-${user.id}`,
    expiresAt: new Date(Date.now() + 86400000),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
})

// Mock organization data
const mockOrganization = {
  id: "org-123",
  name: "Test Organization",
  slug: "test-organization",
  ownerId: mockOwner.id,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockOwnerMembership = {
  id: "member-owner",
  orgId: mockOrganization.id,
  userId: mockOwner.id,
  role: "owner" as const,
  joinedAt: new Date(),
}

const mockAdminMembership = {
  id: "member-admin",
  orgId: mockOrganization.id,
  userId: mockAdmin.id,
  role: "admin" as const,
  joinedAt: new Date(),
}

const mockMemberMembership = {
  id: "member-member",
  orgId: mockOrganization.id,
  userId: mockMember.id,
  role: "member" as const,
  joinedAt: new Date(),
}

// Mock addon data
const mockOrgAddon = {
  id: "org-addon-1",
  organizationId: mockOrganization.id,
  addonSlug: "flood-risk",
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
  organizations: {
    id: "id",
    name: "name",
    slug: "slug",
    ownerId: "owner_id",
  },
  organizationMembers: {
    id: "id",
    orgId: "org_id",
    userId: "user_id",
    role: "role",
  },
  organizationAddons: {
    id: "id",
    organizationId: "organization_id",
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

describe("Organization Addon Toggle API", () => {
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

  function createRequest(
    body: unknown,
    orgId: string = "org-123",
    slug: string = "flood-risk"
  ): {
    request: NextRequest
    params: Promise<{ id: string; slug: string }>
  } {
    const request = new NextRequest(
      `http://localhost:3000/api/organizations/${orgId}/addons/${slug}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
    return {
      request,
      params: Promise.resolve({ id: orgId, slug }),
    }
  }

  describe("PATCH /api/organizations/[id]/addons/[slug]", () => {
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

    it("returns 400 when body is invalid JSON", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(createSession(mockOwner))

      const { PATCH } = await import("./route")
      const request = new NextRequest(
        "http://localhost:3000/api/organizations/org-123/addons/flood-risk",
        {
          method: "PATCH",
          body: "invalid json",
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
      const response = await PATCH(request, {
        params: Promise.resolve({ id: "org-123", slug: "flood-risk" }),
      })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe("Invalid JSON body")
    })

    it("returns 400 when enabled field is missing", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(createSession(mockOwner))

      const { PATCH } = await import("./route")
      const { request, params } = createRequest({})
      const response = await PATCH(request, { params })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe("enabled field must be a boolean")
    })

    it("returns 400 when enabled field is not a boolean", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(createSession(mockOwner))

      const { PATCH } = await import("./route")
      const { request, params } = createRequest({ enabled: "true" })
      const response = await PATCH(request, { params })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe("enabled field must be a boolean")
    })

    it("returns 404 when organization not found", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(createSession(mockOwner))

      // Organization not found
      mockWhere.mockResolvedValueOnce([])

      const { PATCH } = await import("./route")
      const { request, params } = createRequest({ enabled: false }, "org-not-found")
      const response = await PATCH(request, { params })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toBe("Organization not found")
    })

    it("returns 403 when user is not a member", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(createSession(mockNonMember))

      // Organization found
      mockWhere.mockResolvedValueOnce([mockOrganization])
      // No membership
      mockWhere.mockResolvedValueOnce([])

      const { PATCH } = await import("./route")
      const { request, params } = createRequest({ enabled: false })
      const response = await PATCH(request, { params })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.error).toBe("Only owners and admins can toggle organization addons")
    })

    it("returns 403 when user is a regular member (not owner/admin)", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(createSession(mockMember))

      // Organization found
      mockWhere.mockResolvedValueOnce([mockOrganization])
      // Member role (not owner/admin)
      mockWhere.mockResolvedValueOnce([mockMemberMembership])

      const { PATCH } = await import("./route")
      const { request, params } = createRequest({ enabled: false })
      const response = await PATCH(request, { params })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.error).toBe("Only owners and admins can toggle organization addons")
    })

    it("returns 404 when addon grant not found for organization", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(createSession(mockOwner))

      // Organization found
      mockWhere.mockResolvedValueOnce([mockOrganization])
      // Owner membership
      mockWhere.mockResolvedValueOnce([mockOwnerMembership])
      // Addon not found
      mockLimit.mockResolvedValueOnce([])

      const { PATCH } = await import("./route")
      const { request, params } = createRequest({ enabled: false }, "org-123", "nonexistent-addon")
      const response = await PATCH(request, { params })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toBe("Addon not found for organization")
    })

    it("successfully enables an addon as owner", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(createSession(mockOwner))

      // Organization found
      mockWhere.mockResolvedValueOnce([mockOrganization])
      // Owner membership
      mockWhere.mockResolvedValueOnce([mockOwnerMembership])
      // Addon found (currently disabled)
      mockLimit.mockResolvedValueOnce([{ ...mockOrgAddon, enabled: false }])
      // Update successful
      mockReturning.mockResolvedValueOnce([{ ...mockOrgAddon, enabled: true }])

      const { PATCH } = await import("./route")
      const { request, params } = createRequest({ enabled: true })
      const response = await PATCH(request, { params })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.addon.enabled).toBe(true)
      expect(json.addon.addonSlug).toBe("flood-risk")
    })

    it("successfully disables an addon as owner", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(createSession(mockOwner))

      // Organization found
      mockWhere.mockResolvedValueOnce([mockOrganization])
      // Owner membership
      mockWhere.mockResolvedValueOnce([mockOwnerMembership])
      // Addon found (currently enabled)
      mockLimit.mockResolvedValueOnce([mockOrgAddon])
      // Update successful
      mockReturning.mockResolvedValueOnce([{ ...mockOrgAddon, enabled: false }])

      const { PATCH } = await import("./route")
      const { request, params } = createRequest({ enabled: false })
      const response = await PATCH(request, { params })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.addon.enabled).toBe(false)
    })

    it("successfully toggles addon as admin", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(createSession(mockAdmin))

      // Organization found
      mockWhere.mockResolvedValueOnce([mockOrganization])
      // Admin membership
      mockWhere.mockResolvedValueOnce([mockAdminMembership])
      // Addon found
      mockLimit.mockResolvedValueOnce([mockOrgAddon])
      // Update successful
      mockReturning.mockResolvedValueOnce([{ ...mockOrgAddon, enabled: false }])

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
      vi.mocked(getServerSession).mockResolvedValue(createSession(mockOwner))

      // Organization found
      mockWhere.mockResolvedValueOnce([mockOrganization])
      // Owner membership
      mockWhere.mockResolvedValueOnce([mockOwnerMembership])
      // Addon found
      mockLimit.mockResolvedValueOnce([mockOrgAddon])
      // Update returns empty array
      mockReturning.mockResolvedValueOnce([])

      const { PATCH } = await import("./route")
      const { request, params } = createRequest({ enabled: false })
      const response = await PATCH(request, { params })
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.error).toBe("Failed to update addon")
    })

    it("returns 500 when database throws an error", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(createSession(mockOwner))

      // Simulate database error
      mockWhere.mockRejectedValueOnce(new Error("Database error"))

      const { PATCH } = await import("./route")
      const { request, params } = createRequest({ enabled: false })
      const response = await PATCH(request, { params })
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.error).toBe("Failed to update organization addon")
    })

    it("includes addon details in response", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(createSession(mockOwner))

      const addonWithExpiry = {
        ...mockOrgAddon,
        expiresAt: new Date("2026-12-31"),
      }

      // Organization found
      mockWhere.mockResolvedValueOnce([mockOrganization])
      // Owner membership
      mockWhere.mockResolvedValueOnce([mockOwnerMembership])
      // Addon found with expiry
      mockLimit.mockResolvedValueOnce([addonWithExpiry])
      // Update successful
      mockReturning.mockResolvedValueOnce([{ ...addonWithExpiry, enabled: false }])

      const { PATCH } = await import("./route")
      const { request, params } = createRequest({ enabled: false })
      const response = await PATCH(request, { params })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.addon.id).toBe("org-addon-1")
      expect(json.addon.addonSlug).toBe("flood-risk")
      expect(json.addon.grantedAt).toBeDefined()
      expect(json.addon.expiresAt).toBeDefined()
    })
  })
})
