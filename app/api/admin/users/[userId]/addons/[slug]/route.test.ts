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

// Mock user addon data
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
const mockDbDelete = vi.fn()

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => ({
    select: mockDbSelect,
    delete: mockDbDelete,
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
}))

describe("DELETE /api/admin/users/[userId]/addons/[slug]", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("returns 401 when not authenticated", async () => {
    const { requireAdmin } = await import("@/lib/auth-server")
    vi.mocked(requireAdmin).mockRejectedValue(new Error("Unauthorized"))

    const { DELETE } = await import("./route")
    const request = new NextRequest(
      "http://localhost/api/admin/users/user-123/addons/flood",
      { method: "DELETE" }
    )
    const response = await DELETE(request, {
      params: Promise.resolve({ userId: "user-123", slug: "flood" }),
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

    const { DELETE } = await import("./route")
    const request = new NextRequest(
      "http://localhost/api/admin/users/user-123/addons/flood",
      { method: "DELETE" }
    )
    const response = await DELETE(request, {
      params: Promise.resolve({ userId: "user-123", slug: "flood" }),
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

    const { DELETE } = await import("./route")
    const request = new NextRequest(
      "http://localhost/api/admin/users/non-existent/addons/flood",
      { method: "DELETE" }
    )
    const response = await DELETE(request, {
      params: Promise.resolve({ userId: "non-existent", slug: "flood" }),
    })
    const json = await response.json()

    expect(response.status).toBe(404)
    expect(json.error).toBe("User not found")
  })

  it("returns 404 when addon grant not found for user", async () => {
    const { requireAdmin } = await import("@/lib/auth-server")
    vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

    // First call: get user (found)
    // Second call: get addon grant (not found)
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

    const { DELETE } = await import("./route")
    const request = new NextRequest(
      `http://localhost/api/admin/users/${mockUser.id}/addons/non-existent`,
      { method: "DELETE" }
    )
    const response = await DELETE(request, {
      params: Promise.resolve({ userId: mockUser.id, slug: "non-existent" }),
    })
    const json = await response.json()

    expect(response.status).toBe(404)
    expect(json.error).toBe("Addon grant not found for this user")
  })

  it("revokes addon successfully", async () => {
    const { requireAdmin } = await import("@/lib/auth-server")
    vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

    // First call: get user
    // Second call: get addon grant
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

    mockDbDelete.mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    })

    const { DELETE } = await import("./route")
    const request = new NextRequest(
      `http://localhost/api/admin/users/${mockUser.id}/addons/flood`,
      { method: "DELETE" }
    )
    const response = await DELETE(request, {
      params: Promise.resolve({ userId: mockUser.id, slug: "flood" }),
    })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.message).toBe("Addon 'flood' revoked from user")
    expect(json.revokedGrant.id).toBe(mockUserAddon.id)
    expect(json.revokedGrant.userId).toBe(mockUser.id)
    expect(json.revokedGrant.addonSlug).toBe("flood")
  })

  it("revokes addon with expiration date", async () => {
    const { requireAdmin } = await import("@/lib/auth-server")
    vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const addonWithExpiry = { ...mockUserAddon, expiresAt }

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
          where: vi.fn().mockResolvedValue([addonWithExpiry]),
        }),
      })

    mockDbDelete.mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    })

    const { DELETE } = await import("./route")
    const request = new NextRequest(
      `http://localhost/api/admin/users/${mockUser.id}/addons/flood`,
      { method: "DELETE" }
    )
    const response = await DELETE(request, {
      params: Promise.resolve({ userId: mockUser.id, slug: "flood" }),
    })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.revokedGrant.expiresAt).toBe(expiresAt.toISOString())
  })

  it("handles database errors gracefully", async () => {
    const { requireAdmin } = await import("@/lib/auth-server")
    vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)

    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockRejectedValue(new Error("Database error")),
      }),
    })

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const { DELETE } = await import("./route")
    const request = new NextRequest(
      `http://localhost/api/admin/users/${mockUser.id}/addons/flood`,
      { method: "DELETE" }
    )
    const response = await DELETE(request, {
      params: Promise.resolve({ userId: mockUser.id, slug: "flood" }),
    })
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.error).toBe("Failed to revoke addon from user")
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })
})
