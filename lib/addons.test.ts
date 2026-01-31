import { describe, it, expect, vi, beforeEach } from "vitest"
import type { Addon, UserAddon, OrganizationAddon } from "./addons"

// Mock the database module
vi.mock("./db", () => ({
  getDb: vi.fn(),
  addons: { id: "id", name: "name", slug: "slug", description: "description", createdAt: "createdAt" },
  userAddons: {
    id: "id",
    userId: "userId",
    addonSlug: "addonSlug",
    grantedAt: "grantedAt",
    grantedBy: "grantedBy",
    enabled: "enabled",
    expiresAt: "expiresAt",
  },
  organizationAddons: {
    id: "id",
    organizationId: "organizationId",
    addonSlug: "addonSlug",
    grantedAt: "grantedAt",
    grantedBy: "grantedBy",
    enabled: "enabled",
    expiresAt: "expiresAt",
  },
}))

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args) => ({ type: "eq", args })),
  and: vi.fn((...args) => ({ type: "and", args })),
  or: vi.fn((...args) => ({ type: "or", args })),
  isNull: vi.fn((arg) => ({ type: "isNull", arg })),
  gt: vi.fn((...args) => ({ type: "gt", args })),
}))

// Import after mocks are set up
import { getAvailableAddons, hasAddonAccess, getUserAddons, getOrgAddons, getAllOrgGrantedAddons } from "./addons"
import { getDb } from "./db"

describe("addons utilities", () => {
  let mockDb: {
    select: ReturnType<typeof vi.fn>
    from: ReturnType<typeof vi.fn>
    where: ReturnType<typeof vi.fn>
    limit: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Create chainable mock database
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    }

    // Make select() return an object with from()
    mockDb.select.mockReturnValue({
      from: mockDb.from.mockReturnValue({
        where: mockDb.where.mockReturnValue({
          limit: mockDb.limit,
        }),
      }),
    })

    vi.mocked(getDb).mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>)
  })

  describe("getAvailableAddons", () => {
    it("returns empty array when no addons exist", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockResolvedValue([]),
      })

      const result = await getAvailableAddons()

      expect(result).toEqual([])
    })

    it("returns all available addons", async () => {
      const mockAddons = [
        {
          id: "addon-1",
          name: "Risco de Enchente",
          slug: "flood",
          description: "Análise de risco de enchente",
          createdAt: new Date("2025-01-01"),
        },
        {
          id: "addon-2",
          name: "Simulador de Financiamento",
          slug: "financiamento",
          description: "Simulador de financiamento imobiliário",
          createdAt: new Date("2025-01-01"),
        },
      ]

      mockDb.select.mockReturnValue({
        from: vi.fn().mockResolvedValue(mockAddons),
      })

      const result = await getAvailableAddons()

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        id: "addon-1",
        name: "Risco de Enchente",
        slug: "flood",
        description: "Análise de risco de enchente",
        createdAt: new Date("2025-01-01"),
      })
      expect(result[1].slug).toBe("financiamento")
    })

    it("maps addon properties correctly", async () => {
      const mockAddon = {
        id: "addon-uuid",
        name: "Test Addon",
        slug: "test-addon",
        description: null,
        createdAt: new Date("2025-06-15T10:30:00Z"),
      }

      mockDb.select.mockReturnValue({
        from: vi.fn().mockResolvedValue([mockAddon]),
      })

      const result = await getAvailableAddons()

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual<Addon>({
        id: "addon-uuid",
        name: "Test Addon",
        slug: "test-addon",
        description: null,
        createdAt: new Date("2025-06-15T10:30:00Z"),
      })
    })
  })

  describe("hasAddonAccess", () => {
    it("returns false when user has no addon access", async () => {
      // User addon check returns empty
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      const result = await hasAddonAccess("user-1", "flood")

      expect(result).toBe(false)
    })

    it("returns true when user has personal addon access", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: "user-addon-1" }]),
          }),
        }),
      })

      const result = await hasAddonAccess("user-1", "flood")

      expect(result).toBe(true)
    })

    it("returns true when org has addon access", async () => {
      let callCount = 0

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              callCount++
              // First call (user addon) returns empty, second call (org addon) returns result
              if (callCount === 1) {
                return Promise.resolve([])
              }
              return Promise.resolve([{ id: "org-addon-1" }])
            }),
          }),
        }),
      })

      const result = await hasAddonAccess("user-1", "flood", "org-1")

      expect(result).toBe(true)
    })

    it("returns false when no orgId provided and user has no personal access", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      const result = await hasAddonAccess("user-1", "flood")

      expect(result).toBe(false)
      expect(getDb).toHaveBeenCalled()
    })

    it("prioritizes user addon access over org addon access", async () => {
      // User has personal access, so org check should not be needed
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: "user-addon-1" }]),
          }),
        }),
      })

      const result = await hasAddonAccess("user-1", "flood", "org-1")

      expect(result).toBe(true)
    })

    it("checks org addon when user addon is not found", async () => {
      let callCount = 0

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              callCount++
              if (callCount === 1) {
                return Promise.resolve([]) // No user addon
              }
              return Promise.resolve([]) // No org addon
            }),
          }),
        }),
      })

      const result = await hasAddonAccess("user-1", "flood", "org-1")

      expect(result).toBe(false)
      // Should have made two queries
      expect(callCount).toBe(2)
    })
  })

  describe("getUserAddons", () => {
    it("returns empty array when user has no addons", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })

      const result = await getUserAddons("user-1")

      expect(result).toEqual([])
    })

    it("returns all active user addons", async () => {
      const mockUserAddons = [
        {
          id: "ua-1",
          userId: "user-1",
          addonSlug: "flood",
          grantedAt: new Date("2025-01-01"),
          grantedBy: "admin-1",
          enabled: true,
          expiresAt: null,
        },
        {
          id: "ua-2",
          userId: "user-1",
          addonSlug: "financiamento",
          grantedAt: new Date("2025-01-15"),
          grantedBy: "admin-1",
          enabled: true,
          expiresAt: new Date("2026-01-15"),
        },
      ]

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockUserAddons),
        }),
      })

      const result = await getUserAddons("user-1")

      expect(result).toHaveLength(2)
      expect(result[0].addonSlug).toBe("flood")
      expect(result[1].addonSlug).toBe("financiamento")
    })

    it("maps user addon properties correctly", async () => {
      const mockUserAddon = {
        id: "ua-uuid",
        userId: "user-123",
        addonSlug: "flood",
        grantedAt: new Date("2025-01-01T00:00:00Z"),
        grantedBy: "admin-456",
        enabled: true,
        expiresAt: new Date("2026-01-01T00:00:00Z"),
      }

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockUserAddon]),
        }),
      })

      const result = await getUserAddons("user-123")

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual<UserAddon>({
        id: "ua-uuid",
        userId: "user-123",
        addonSlug: "flood",
        grantedAt: new Date("2025-01-01T00:00:00Z"),
        grantedBy: "admin-456",
        enabled: true,
        expiresAt: new Date("2026-01-01T00:00:00Z"),
      })
    })

    it("handles null grantedBy and expiresAt", async () => {
      const mockUserAddon = {
        id: "ua-1",
        userId: "user-1",
        addonSlug: "flood",
        grantedAt: new Date("2025-01-01"),
        grantedBy: null,
        enabled: true,
        expiresAt: null,
      }

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockUserAddon]),
        }),
      })

      const result = await getUserAddons("user-1")

      expect(result[0].grantedBy).toBeNull()
      expect(result[0].expiresAt).toBeNull()
    })
  })

  describe("getOrgAddons", () => {
    it("returns empty array when org has no addons", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })

      const result = await getOrgAddons("org-1")

      expect(result).toEqual([])
    })

    it("returns all active org addons", async () => {
      const mockOrgAddons = [
        {
          id: "oa-1",
          organizationId: "org-1",
          addonSlug: "flood",
          grantedAt: new Date("2025-01-01"),
          grantedBy: "admin-1",
          enabled: true,
          expiresAt: null,
        },
        {
          id: "oa-2",
          organizationId: "org-1",
          addonSlug: "financiamento",
          grantedAt: new Date("2025-01-15"),
          grantedBy: "admin-1",
          enabled: true,
          expiresAt: new Date("2026-01-15"),
        },
      ]

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockOrgAddons),
        }),
      })

      const result = await getOrgAddons("org-1")

      expect(result).toHaveLength(2)
      expect(result[0].addonSlug).toBe("flood")
      expect(result[1].addonSlug).toBe("financiamento")
    })

    it("maps org addon properties correctly", async () => {
      const mockOrgAddon = {
        id: "oa-uuid",
        organizationId: "org-123",
        addonSlug: "flood",
        grantedAt: new Date("2025-01-01T00:00:00Z"),
        grantedBy: "admin-456",
        enabled: true,
        expiresAt: new Date("2026-01-01T00:00:00Z"),
      }

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockOrgAddon]),
        }),
      })

      const result = await getOrgAddons("org-123")

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual<OrganizationAddon>({
        id: "oa-uuid",
        organizationId: "org-123",
        addonSlug: "flood",
        grantedAt: new Date("2025-01-01T00:00:00Z"),
        grantedBy: "admin-456",
        enabled: true,
        expiresAt: new Date("2026-01-01T00:00:00Z"),
      })
    })

    it("handles null grantedBy and expiresAt", async () => {
      const mockOrgAddon = {
        id: "oa-1",
        organizationId: "org-1",
        addonSlug: "flood",
        grantedAt: new Date("2025-01-01"),
        grantedBy: null,
        enabled: true,
        expiresAt: null,
      }

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockOrgAddon]),
        }),
      })

      const result = await getOrgAddons("org-1")

      expect(result[0].grantedBy).toBeNull()
      expect(result[0].expiresAt).toBeNull()
    })
  })

  describe("getAllOrgGrantedAddons", () => {
    it("returns empty array when org has no addons", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })

      const result = await getAllOrgGrantedAddons("org-1")

      expect(result).toEqual([])
    })

    it("returns all granted addons including disabled ones", async () => {
      const mockOrgAddons = [
        {
          id: "oa-1",
          organizationId: "org-1",
          addonSlug: "flood",
          grantedAt: new Date("2025-01-01"),
          grantedBy: "admin-1",
          enabled: true,
          expiresAt: null,
        },
        {
          id: "oa-2",
          organizationId: "org-1",
          addonSlug: "financiamento",
          grantedAt: new Date("2025-01-15"),
          grantedBy: "admin-1",
          enabled: false, // Disabled addon
          expiresAt: new Date("2026-01-15"),
        },
      ]

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockOrgAddons),
        }),
      })

      const result = await getAllOrgGrantedAddons("org-1")

      expect(result).toHaveLength(2)
      expect(result[0].addonSlug).toBe("flood")
      expect(result[0].enabled).toBe(true)
      expect(result[1].addonSlug).toBe("financiamento")
      expect(result[1].enabled).toBe(false)
    })

    it("returns expired addons for management", async () => {
      const mockOrgAddon = {
        id: "oa-1",
        organizationId: "org-1",
        addonSlug: "flood",
        grantedAt: new Date("2020-01-01"),
        grantedBy: "admin-1",
        enabled: true,
        expiresAt: new Date("2020-12-31"), // Expired
      }

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockOrgAddon]),
        }),
      })

      const result = await getAllOrgGrantedAddons("org-1")

      expect(result).toHaveLength(1)
      expect(result[0].expiresAt).toEqual(new Date("2020-12-31"))
    })

    it("maps org addon properties correctly", async () => {
      const mockOrgAddon = {
        id: "oa-uuid",
        organizationId: "org-123",
        addonSlug: "flood",
        grantedAt: new Date("2025-01-01T00:00:00Z"),
        grantedBy: "admin-456",
        enabled: false,
        expiresAt: new Date("2026-01-01T00:00:00Z"),
      }

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockOrgAddon]),
        }),
      })

      const result = await getAllOrgGrantedAddons("org-123")

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual<OrganizationAddon>({
        id: "oa-uuid",
        organizationId: "org-123",
        addonSlug: "flood",
        grantedAt: new Date("2025-01-01T00:00:00Z"),
        grantedBy: "admin-456",
        enabled: false,
        expiresAt: new Date("2026-01-01T00:00:00Z"),
      })
    })
  })
})
