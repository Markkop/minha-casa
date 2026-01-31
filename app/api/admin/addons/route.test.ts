import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock environment variables
vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test")
vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-key-for-testing-only")

// Mock admin user
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
    name: "Análise de Ruído",
    slug: "noise",
    description: "Análise de níveis de ruído",
    createdAt: new Date("2025-01-02"),
  },
  {
    id: "addon-3",
    name: "Análise de Valor",
    slug: "valuation",
    description: "Análise de valorização do imóvel",
    createdAt: new Date("2025-01-03"),
  },
]

// Mock auth-server
vi.mock("@/lib/auth-server", () => ({
  requireAdmin: vi.fn(),
}))

// Mock addons lib
vi.mock("@/lib/addons", () => ({
  getAvailableAddons: vi.fn(),
}))

describe("GET /api/admin/addons", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("returns 401 when not authenticated", async () => {
    const { requireAdmin } = await import("@/lib/auth-server")
    vi.mocked(requireAdmin).mockRejectedValue(new Error("Unauthorized"))

    const { GET } = await import("./route")
    const response = await GET()
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
    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(403)
    expect(json.error).toBe("Forbidden")
  })

  it("returns all available addons for admin", async () => {
    const { requireAdmin } = await import("@/lib/auth-server")
    vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

    const { getAvailableAddons } = await import("@/lib/addons")
    vi.mocked(getAvailableAddons).mockResolvedValue(mockAddons)

    const { GET } = await import("./route")
    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.addons).toHaveLength(3)
    expect(json.addons[0].slug).toBe("flood")
    expect(json.addons[0].name).toBe("Risco de Enchente")
    expect(json.addons[1].slug).toBe("noise")
    expect(json.addons[2].slug).toBe("valuation")
  })

  it("returns empty array when no addons exist", async () => {
    const { requireAdmin } = await import("@/lib/auth-server")
    vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

    const { getAvailableAddons } = await import("@/lib/addons")
    vi.mocked(getAvailableAddons).mockResolvedValue([])

    const { GET } = await import("./route")
    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.addons).toHaveLength(0)
    expect(json.addons).toEqual([])
  })

  it("includes addon details in response", async () => {
    const { requireAdmin } = await import("@/lib/auth-server")
    vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

    const { getAvailableAddons } = await import("@/lib/addons")
    vi.mocked(getAvailableAddons).mockResolvedValue([mockAddons[0]])

    const { GET } = await import("./route")
    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.addons).toHaveLength(1)
    expect(json.addons[0]).toHaveProperty("id")
    expect(json.addons[0]).toHaveProperty("name")
    expect(json.addons[0]).toHaveProperty("slug")
    expect(json.addons[0]).toHaveProperty("description")
    expect(json.addons[0]).toHaveProperty("createdAt")
  })

  it("returns 500 when getAvailableAddons throws an error", async () => {
    const { requireAdmin } = await import("@/lib/auth-server")
    vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

    const { getAvailableAddons } = await import("@/lib/addons")
    vi.mocked(getAvailableAddons).mockRejectedValue(new Error("Database error"))

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {})

    const { GET } = await import("./route")
    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.error).toBe("Failed to fetch addons")
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it("calls requireAdmin to verify authentication", async () => {
    const { requireAdmin } = await import("@/lib/auth-server")
    vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

    const { getAvailableAddons } = await import("@/lib/addons")
    vi.mocked(getAvailableAddons).mockResolvedValue([])

    const { GET } = await import("./route")
    await GET()

    expect(requireAdmin).toHaveBeenCalledTimes(1)
  })

  it("handles single addon correctly", async () => {
    const { requireAdmin } = await import("@/lib/auth-server")
    vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

    const singleAddon = {
      id: "addon-solo",
      name: "Single Addon",
      slug: "single",
      description: null,
      createdAt: new Date("2025-06-15"),
    }

    const { getAvailableAddons } = await import("@/lib/addons")
    vi.mocked(getAvailableAddons).mockResolvedValue([singleAddon])

    const { GET } = await import("./route")
    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.addons).toHaveLength(1)
    expect(json.addons[0].slug).toBe("single")
    expect(json.addons[0].description).toBeNull()
  })

  it("returns addons with null description", async () => {
    const { requireAdmin } = await import("@/lib/auth-server")
    vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

    const addonWithNullDesc = {
      id: "addon-no-desc",
      name: "No Description Addon",
      slug: "no-desc",
      description: null,
      createdAt: new Date("2025-01-01"),
    }

    const { getAvailableAddons } = await import("@/lib/addons")
    vi.mocked(getAvailableAddons).mockResolvedValue([addonWithNullDesc])

    const { GET } = await import("./route")
    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.addons[0].description).toBeNull()
  })
})
