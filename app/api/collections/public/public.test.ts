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

// Mock public collection data
const mockPublicCollection = {
  id: "col-public-123",
  userId: mockUser.id,
  orgId: null,
  name: "Public Collection",
  isPublic: true,
  shareToken: "share123",
  isDefault: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ownerName: mockUser.name,
  listingsCount: 2,
}

const mockPrivateCollection = {
  id: "col-private-123",
  userId: mockUser.id,
  orgId: null,
  name: "Private Collection",
  isPublic: false,
  shareToken: null,
  isDefault: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockListing = {
  id: "listing-123",
  collectionId: mockPublicCollection.id,
  data: {
    titulo: "Test Listing",
    endereco: "Test Address",
    m2Totais: 100,
    m2Privado: 80,
    quartos: 3,
    suites: 1,
    banheiros: 2,
    garagem: 2,
    preco: 500000,
    precoM2: 5000,
    piscina: false,
    porteiro24h: true,
    academia: true,
    vistaLivre: false,
    piscinaTermica: false,
    link: "https://example.com",
  },
  createdAt: new Date(),
  updatedAt: new Date(),
}

// Mock database
const mockDbSelect = vi.fn()

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => ({
    select: mockDbSelect,
  })),
  collections: { id: "id", isPublic: "isPublic", userId: "userId" },
  users: { id: "id", name: "name" },
  listings: { collectionId: "collectionId" },
}))

describe("Public Collections API", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe("GET /api/collections/public", () => {
    it("returns list of public collections", async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([mockPublicCollection]),
            }),
          }),
        }),
      })

      const { GET } = await import("./route")
      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.collections).toHaveLength(1)
      expect(json.collections[0].name).toBe("Public Collection")
      expect(json.collections[0].isPublic).toBe(true)
      expect(json.collections[0].ownerName).toBe("Test User")
    })

    it("returns empty array when no public collections exist", async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      })

      const { GET } = await import("./route")
      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.collections).toHaveLength(0)
    })

    it("does not require authentication", async () => {
      // This test verifies that the endpoint doesn't check for session
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([mockPublicCollection]),
            }),
          }),
        }),
      })

      const { GET } = await import("./route")
      const response = await GET()

      expect(response.status).toBe(200)
    })
  })

  describe("GET /api/collections/public/[id]", () => {
    it("returns public collection with listings", async () => {
      // First call: fetch collection
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockPublicCollection]),
          }),
        }),
      })
      // Second call: fetch listings
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([mockListing]),
          }),
        }),
      })

      const { GET } = await import("./[id]/route")
      const request = new NextRequest("http://localhost/api/collections/public/col-public-123")

      const response = await GET(request, { params: Promise.resolve({ id: "col-public-123" }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.collection.name).toBe("Public Collection")
      expect(json.collection.isPublic).toBe(true)
      expect(json.listings).toHaveLength(1)
      expect(json.listings[0].data.titulo).toBe("Test Listing")
    })

    it("returns 404 for non-existent collection", async () => {
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      const { GET } = await import("./[id]/route")
      const request = new NextRequest("http://localhost/api/collections/public/non-existent")

      const response = await GET(request, { params: Promise.resolve({ id: "non-existent" }) })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toBe("Collection not found or is not public")
    })

    it("returns 404 for private collection", async () => {
      // Simulate querying for a private collection - should return empty because we only query public ones
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      const { GET } = await import("./[id]/route")
      const request = new NextRequest("http://localhost/api/collections/public/col-private-123")

      const response = await GET(request, { params: Promise.resolve({ id: "col-private-123" }) })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toBe("Collection not found or is not public")
    })

    it("does not require authentication", async () => {
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockPublicCollection]),
          }),
        }),
      })
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      const { GET } = await import("./[id]/route")
      const request = new NextRequest("http://localhost/api/collections/public/col-public-123")

      const response = await GET(request, { params: Promise.resolve({ id: "col-public-123" }) })

      expect(response.status).toBe(200)
    })
  })
})

describe("Collection isPublic Toggle", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe("PUT /api/collections/[id] with isPublic", () => {
    it("can toggle collection to public", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue({
        user: mockUser,
        session: {
          id: "session-123",
          userId: mockUser.id,
          token: "test-token",
          expiresAt: new Date(Date.now() + 86400000),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      const updatedCollection = { ...mockPrivateCollection, isPublic: true }

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockPrivateCollection]),
        }),
      })

      const mockDbUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedCollection]),
          }),
        }),
      })

      vi.doMock("@/lib/db", () => ({
        getDb: vi.fn(() => ({
          select: mockDbSelect,
          update: mockDbUpdate,
        })),
        collections: { id: "id", userId: "userId" },
      }))

      const { PUT } = await import("../[id]/route")
      const request = new NextRequest("http://localhost/api/collections/col-private-123", {
        method: "PUT",
        body: JSON.stringify({ isPublic: true }),
      })

      const response = await PUT(request, { params: Promise.resolve({ id: "col-private-123" }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.collection.isPublic).toBe(true)
    })

    it("can toggle collection to private", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue({
        user: mockUser,
        session: {
          id: "session-123",
          userId: mockUser.id,
          token: "test-token",
          expiresAt: new Date(Date.now() + 86400000),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      const updatedCollection = { ...mockPublicCollection, isPublic: false }

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockPublicCollection]),
        }),
      })

      const mockDbUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedCollection]),
          }),
        }),
      })

      vi.doMock("@/lib/db", () => ({
        getDb: vi.fn(() => ({
          select: mockDbSelect,
          update: mockDbUpdate,
        })),
        collections: { id: "id", userId: "userId" },
      }))

      const { PUT } = await import("../[id]/route")
      const request = new NextRequest("http://localhost/api/collections/col-public-123", {
        method: "PUT",
        body: JSON.stringify({ isPublic: false }),
      })

      const response = await PUT(request, { params: Promise.resolve({ id: "col-public-123" }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.collection.isPublic).toBe(false)
    })
  })
})

// Mock auth-server
vi.mock("@/lib/auth-server", () => ({
  getServerSession: vi.fn(),
}))
