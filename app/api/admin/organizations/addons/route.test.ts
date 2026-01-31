import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { GET } from "./route"

// Mock auth-server module
vi.mock("@/lib/auth-server", () => ({
  requireAdmin: vi.fn(),
}))

// Mock database module
vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
  organizations: {
    id: "id",
    name: "name",
    slug: "slug",
    createdAt: "created_at",
    ownerId: "owner_id",
  },
  organizationAddons: {
    id: "id",
    organizationId: "organization_id",
    addonSlug: "addon_slug",
    grantedAt: "granted_at",
    grantedBy: "granted_by",
    enabled: "enabled",
    expiresAt: "expires_at",
  },
  addons: {
    id: "id",
    name: "name",
    slug: "slug",
    description: "description",
  },
  users: {
    id: "id",
    name: "name",
    email: "email",
  },
}))

import { requireAdmin } from "@/lib/auth-server"
import { getDb } from "@/lib/db"

describe("GET /api/admin/organizations/addons", () => {
  let mockDb: {
    select: ReturnType<typeof vi.fn>
    from: ReturnType<typeof vi.fn>
  }

  const mockOrganizations = [
    {
      id: "org-1",
      name: "Test Org 1",
      slug: "test-org-1",
      createdAt: new Date("2025-01-01"),
      ownerId: "user-1",
    },
    {
      id: "org-2",
      name: "Test Org 2",
      slug: "test-org-2",
      createdAt: new Date("2025-01-02"),
      ownerId: "user-2",
    },
  ]

  const mockOrgAddons = [
    {
      id: "org-addon-1",
      organizationId: "org-1",
      addonSlug: "flood",
      grantedAt: new Date("2025-01-01"),
      grantedBy: "admin-1",
      enabled: true,
      expiresAt: null,
    },
  ]

  const mockAddons = [
    {
      id: "addon-1",
      name: "Risco de Enchente",
      slug: "flood",
      description: "Análise de risco de enchente",
    },
  ]

  const mockUsers = [
    { id: "user-1", name: "John Doe", email: "john@example.com" },
    { id: "user-2", name: "Jane Smith", email: "jane@example.com" },
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    let callCount = 0

    mockDb = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => {
          callCount++
          // Return different data based on call order
          if (callCount === 1) return Promise.resolve(mockOrganizations)
          if (callCount === 2) return Promise.resolve(mockOrgAddons)
          if (callCount === 3) return Promise.resolve(mockAddons)
          if (callCount === 4) return Promise.resolve(mockUsers)
          return Promise.resolve([])
        }),
      })),
      from: vi.fn(),
    }

    vi.mocked(getDb).mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>)
    vi.mocked(requireAdmin).mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com" },
      session: { id: "session-1" },
    } as Awaited<ReturnType<typeof requireAdmin>>)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(new Error("Unauthorized"))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized")
  })

  it("returns 403 when user is not admin", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(new Error("Forbidden: Admin access required"))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe("Forbidden")
  })

  it("returns organizations with addon status for admin", async () => {
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.organizations).toBeDefined()
    expect(data.availableAddons).toBeDefined()
    expect(Array.isArray(data.organizations)).toBe(true)
  })

  it("includes available addons in response", async () => {
    const response = await GET()
    const data = await response.json()

    expect(data.availableAddons).toBeDefined()
    expect(Array.isArray(data.availableAddons)).toBe(true)
  })

  it("maps organization data correctly", async () => {
    const response = await GET()
    const data = await response.json()

    expect(data.organizations).toHaveLength(2)
    const org = data.organizations[0]
    expect(org).toHaveProperty("id")
    expect(org).toHaveProperty("name")
    expect(org).toHaveProperty("slug")
    expect(org).toHaveProperty("addons")
  })

  it("includes addon grants in organization data", async () => {
    const response = await GET()
    const data = await response.json()

    const org1 = data.organizations.find((o: { id: string }) => o.id === "org-1")
    expect(org1).toBeDefined()
    expect(org1.addons).toHaveLength(1)
    expect(org1.addons[0].addonSlug).toBe("flood")
  })

  it("handles organizations without addons", async () => {
    const response = await GET()
    const data = await response.json()

    const org2 = data.organizations.find((o: { id: string }) => o.id === "org-2")
    expect(org2).toBeDefined()
    expect(org2.addons).toHaveLength(0)
  })

  it("handles database errors gracefully", async () => {
    vi.mocked(getDb).mockReturnValue({
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockRejectedValue(new Error("Database error")),
      })),
    } as unknown as ReturnType<typeof getDb>)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("Failed to fetch organizations with addons")
  })
})
