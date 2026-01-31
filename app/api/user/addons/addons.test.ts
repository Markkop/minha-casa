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

// Mock addon data
const mockAddon = {
  id: "addon-1",
  name: "Risco de Enchente",
  slug: "flood",
  description: "Análise de risco de enchente",
  createdAt: new Date(),
}

const mockAddon2 = {
  id: "addon-2",
  name: "Análise de Ruído",
  slug: "noise",
  description: "Análise de níveis de ruído",
  createdAt: new Date(),
}

const mockUserAddon = {
  id: "user-addon-1",
  userId: mockUser.id,
  addonSlug: "flood",
  grantedAt: new Date(),
  grantedBy: "admin-123",
  enabled: true,
  expiresAt: null,
}

const mockUserAddon2 = {
  id: "user-addon-2",
  userId: mockUser.id,
  addonSlug: "noise",
  grantedAt: new Date(),
  grantedBy: "admin-123",
  enabled: true,
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
}

// Mock auth-server
vi.mock("@/lib/auth-server", () => ({
  getServerSession: vi.fn(),
}))

// Mock addons lib
vi.mock("@/lib/addons", () => ({
  getUserAddons: vi.fn(),
  getAvailableAddons: vi.fn(),
}))

describe("User Addons API", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe("GET /api/user/addons", () => {
    it("returns 401 when not authenticated", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { GET } = await import("./route")
      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe("Unauthorized")
    })

    it("returns empty addons array when user has no addons", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { getUserAddons, getAvailableAddons } = await import("@/lib/addons")
      vi.mocked(getUserAddons).mockResolvedValue([])
      vi.mocked(getAvailableAddons).mockResolvedValue([mockAddon, mockAddon2])

      const { GET } = await import("./route")
      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.addons).toHaveLength(0)
    })

    it("returns user addons with details successfully", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { getUserAddons, getAvailableAddons } = await import("@/lib/addons")
      vi.mocked(getUserAddons).mockResolvedValue([mockUserAddon, mockUserAddon2])
      vi.mocked(getAvailableAddons).mockResolvedValue([mockAddon, mockAddon2])

      const { GET } = await import("./route")
      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.addons).toHaveLength(2)
      expect(json.addons[0].addonSlug).toBe("flood")
      expect(json.addons[0].addon.name).toBe("Risco de Enchente")
      expect(json.addons[1].addonSlug).toBe("noise")
      expect(json.addons[1].addon.name).toBe("Análise de Ruído")
    })

    it("returns addon with null when addon details not found", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { getUserAddons, getAvailableAddons } = await import("@/lib/addons")
      vi.mocked(getUserAddons).mockResolvedValue([mockUserAddon])
      // Return empty addons list - addon details won't be found
      vi.mocked(getAvailableAddons).mockResolvedValue([])

      const { GET } = await import("./route")
      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.addons).toHaveLength(1)
      expect(json.addons[0].addonSlug).toBe("flood")
      expect(json.addons[0].addon).toBeNull()
    })

    it("includes grantedAt and expiresAt in response", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { getUserAddons, getAvailableAddons } = await import("@/lib/addons")
      vi.mocked(getUserAddons).mockResolvedValue([mockUserAddon2])
      vi.mocked(getAvailableAddons).mockResolvedValue([mockAddon2])

      const { GET } = await import("./route")
      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.addons).toHaveLength(1)
      expect(json.addons[0].grantedAt).toBeDefined()
      expect(json.addons[0].expiresAt).toBeDefined()
    })

    it("returns 500 when getUserAddons throws an error", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { getUserAddons } = await import("@/lib/addons")
      vi.mocked(getUserAddons).mockRejectedValue(new Error("Database error"))

      const { GET } = await import("./route")
      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.error).toBe("Failed to fetch user addons")
    })

    it("calls getUserAddons with correct user ID", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { getUserAddons, getAvailableAddons } = await import("@/lib/addons")
      vi.mocked(getUserAddons).mockResolvedValue([])
      vi.mocked(getAvailableAddons).mockResolvedValue([])

      const { GET } = await import("./route")
      await GET()

      expect(getUserAddons).toHaveBeenCalledWith(mockUser.id)
    })
  })
})
