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

// Mock collection data
const mockCollection = {
  id: "col-123",
  userId: mockUser.id,
  orgId: null,
  name: "Test Collection",
  isPublic: false,
  shareToken: null,
  isDefault: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockSharedCollection = {
  ...mockCollection,
  isPublic: true,
  shareToken: "abc123def456ghij",
}

// Mock getServerSession
vi.mock("@/lib/auth-server", () => ({
  getServerSession: vi.fn(),
}))

// Mock database
const mockDbSelect = vi.fn()
const mockDbUpdate = vi.fn()

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => ({
    select: mockDbSelect,
    update: mockDbUpdate,
  })),
  collections: { userId: "userId", id: "id", shareToken: "shareToken" },
}))

describe("Share Collection API", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe("GET /api/collections/[id]/share", () => {
    it("returns 401 when not authenticated", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { GET } = await import("./route")
      const request = new NextRequest("http://localhost/api/collections/col-123/share")

      const response = await GET(request, { params: Promise.resolve({ id: "col-123" }) })
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe("Unauthorized")
    })

    it("returns 404 when collection not found", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })

      const { GET } = await import("./route")
      const request = new NextRequest("http://localhost/api/collections/col-not-found/share")

      const response = await GET(request, { params: Promise.resolve({ id: "col-not-found" }) })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toBe("Collection not found")
    })

    it("returns isShared=false when collection is not shared", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockCollection]),
        }),
      })

      const { GET } = await import("./route")
      const request = new NextRequest("http://localhost/api/collections/col-123/share")

      const response = await GET(request, { params: Promise.resolve({ id: "col-123" }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.isShared).toBe(false)
      expect(json.shareToken).toBeNull()
      expect(json.shareUrl).toBeNull()
    })

    it("returns share info when collection is shared", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockSharedCollection]),
        }),
      })

      const { GET } = await import("./route")
      const request = new NextRequest("http://localhost/api/collections/col-123/share")

      const response = await GET(request, { params: Promise.resolve({ id: "col-123" }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.isShared).toBe(true)
      expect(json.shareToken).toBe("abc123def456ghij")
      expect(json.shareUrl).toContain("share=abc123def456ghij")
    })
  })

  describe("POST /api/collections/[id]/share", () => {
    it("returns 401 when not authenticated", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { POST } = await import("./route")
      const request = new NextRequest("http://localhost/api/collections/col-123/share", {
        method: "POST",
      })

      const response = await POST(request, { params: Promise.resolve({ id: "col-123" }) })
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe("Unauthorized")
    })

    it("returns 404 when collection not found", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })

      const { POST } = await import("./route")
      const request = new NextRequest("http://localhost/api/collections/col-not-found/share", {
        method: "POST",
      })

      const response = await POST(request, { params: Promise.resolve({ id: "col-not-found" }) })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toBe("Collection not found")
    })

    it("returns existing share URL when collection is already shared", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockSharedCollection]),
        }),
      })

      const { POST } = await import("./route")
      const request = new NextRequest("http://localhost/api/collections/col-123/share", {
        method: "POST",
      })

      const response = await POST(request, { params: Promise.resolve({ id: "col-123" }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.shareUrl).toContain("share=abc123def456ghij")
      expect(mockDbUpdate).not.toHaveBeenCalled()
    })

    it("generates new share token when collection is not shared", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const updatedCollection = {
        ...mockCollection,
        isPublic: true,
        shareToken: "newtoken12345678",
      }

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockCollection]),
        }),
      })

      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedCollection]),
          }),
        }),
      })

      const { POST } = await import("./route")
      const request = new NextRequest("http://localhost/api/collections/col-123/share", {
        method: "POST",
      })

      const response = await POST(request, { params: Promise.resolve({ id: "col-123" }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.shareUrl).toBeDefined()
      expect(json.collection.isPublic).toBe(true)
      expect(mockDbUpdate).toHaveBeenCalled()
    })
  })

  describe("DELETE /api/collections/[id]/share", () => {
    it("returns 401 when not authenticated", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { DELETE } = await import("./route")
      const request = new NextRequest("http://localhost/api/collections/col-123/share", {
        method: "DELETE",
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: "col-123" }) })
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe("Unauthorized")
    })

    it("returns 404 when collection not found", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })

      const { DELETE } = await import("./route")
      const request = new NextRequest("http://localhost/api/collections/col-not-found/share", {
        method: "DELETE",
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: "col-not-found" }) })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toBe("Collection not found")
    })

    it("revokes sharing successfully", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const unsharedCollection = {
        ...mockSharedCollection,
        isPublic: false,
        shareToken: null,
      }

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockSharedCollection]),
        }),
      })

      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([unsharedCollection]),
          }),
        }),
      })

      const { DELETE } = await import("./route")
      const request = new NextRequest("http://localhost/api/collections/col-123/share", {
        method: "DELETE",
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: "col-123" }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.collection.isPublic).toBe(false)
      expect(json.collection.shareToken).toBeNull()
    })
  })
})
