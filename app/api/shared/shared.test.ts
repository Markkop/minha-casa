import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock environment variables
vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test")
vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-key-for-testing-only")

// Mock collection data
const mockSharedCollection = {
  id: "col-123",
  userId: "user-123",
  orgId: null,
  name: "Test Collection",
  isPublic: true,
  shareToken: "abc123def456ghij",
  isDefault: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockNonPublicCollection = {
  ...mockSharedCollection,
  isPublic: false,
}

const mockListing = {
  id: "listing-123",
  collectionId: "col-123",
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
  collections: { shareToken: "shareToken", id: "id" },
  listings: { collectionId: "collectionId" },
}))

describe("Shared Collection API", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe("GET /api/shared/[token]", () => {
    it("returns 400 when token is empty", async () => {
      const { GET } = await import("./[token]/route")
      const request = new NextRequest("http://localhost/api/shared/")

      const response = await GET(request, { params: Promise.resolve({ token: "" }) })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe("Token é obrigatório")
    })

    it("returns 404 when shared collection not found", async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })

      const { GET } = await import("./[token]/route")
      const request = new NextRequest("http://localhost/api/shared/invalid-token")

      const response = await GET(request, { params: Promise.resolve({ token: "invalid-token" }) })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toBe("Coleção compartilhada não encontrada")
    })

    it("returns 403 when collection is not public", async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockNonPublicCollection]),
        }),
      })

      const { GET } = await import("./[token]/route")
      const request = new NextRequest("http://localhost/api/shared/abc123def456ghij")

      const response = await GET(request, { params: Promise.resolve({ token: "abc123def456ghij" }) })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.error).toBe("Esta coleção não está mais compartilhada")
    })

    it("returns shared collection with listings successfully", async () => {
      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockSharedCollection]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([mockListing]),
            }),
          }),
        })

      const { GET } = await import("./[token]/route")
      const request = new NextRequest("http://localhost/api/shared/abc123def456ghij")

      const response = await GET(request, { params: Promise.resolve({ token: "abc123def456ghij" }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.collection.name).toBe("Test Collection")
      expect(json.collection.id).toBe("col-123")
      expect(json.listings).toHaveLength(1)
      expect(json.listings[0].data.titulo).toBe("Test Listing")
      expect(json.metadata.totalListings).toBe(1)
    })

    it("returns empty listings array when collection has no listings", async () => {
      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockSharedCollection]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([]),
            }),
          }),
        })

      const { GET } = await import("./[token]/route")
      const request = new NextRequest("http://localhost/api/shared/abc123def456ghij")

      const response = await GET(request, { params: Promise.resolve({ token: "abc123def456ghij" }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.listings).toHaveLength(0)
      expect(json.metadata.totalListings).toBe(0)
    })

    it("does not expose sensitive data like userId", async () => {
      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockSharedCollection]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([]),
            }),
          }),
        })

      const { GET } = await import("./[token]/route")
      const request = new NextRequest("http://localhost/api/shared/abc123def456ghij")

      const response = await GET(request, { params: Promise.resolve({ token: "abc123def456ghij" }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      // userId should not be exposed in the response
      expect(json.collection.userId).toBeUndefined()
      expect(json.collection.shareToken).toBeUndefined()
      expect(json.collection.isPublic).toBeUndefined()
    })
  })
})
