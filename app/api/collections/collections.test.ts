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

const mockListing = {
  id: "listing-123",
  collectionId: mockCollection.id,
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

// Mock getServerSession
vi.mock("@/lib/auth-server", () => ({
  getServerSession: vi.fn(),
}))

// Mock organization data
const mockOrganization = {
  id: "org-123",
  name: "Test Organization",
  slug: "test-org",
  ownerId: mockUser.id,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockOrgMembership = {
  id: "member-123",
  orgId: mockOrganization.id,
  userId: mockUser.id,
  role: "owner" as const,
  joinedAt: new Date(),
}

const mockOrgCollection = {
  id: "org-col-123",
  userId: null,
  orgId: mockOrganization.id,
  name: "Org Collection",
  isPublic: false,
  shareToken: null,
  isDefault: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}

// Mock database
const mockDbSelect = vi.fn()
const mockDbInsert = vi.fn()
const mockDbUpdate = vi.fn()
const mockDbDelete = vi.fn()

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => ({
    select: mockDbSelect,
    insert: mockDbInsert,
    update: mockDbUpdate,
    delete: mockDbDelete,
  })),
  collections: { userId: "userId", id: "id", orgId: "orgId" },
  listings: { collectionId: "collectionId", id: "id" },
  organizationMembers: { orgId: "orgId", userId: "userId" },
}))

describe("Collections API", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe("GET /api/collections", () => {
    it("returns 401 when not authenticated", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { GET } = await import("./route")
      const request = new NextRequest("http://localhost/api/collections")
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe("Unauthorized")
    })

    it("returns user personal collections when authenticated", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([mockCollection]),
          }),
        }),
      })

      const { GET } = await import("./route")
      const request = new NextRequest("http://localhost/api/collections")
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.collections).toHaveLength(1)
      expect(json.collections[0].name).toBe("Test Collection")
    })

    it("returns organization collections when orgId provided", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      // First call: check membership
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockOrgMembership]),
        }),
      })
      // Second call: fetch org collections
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([mockOrgCollection]),
          }),
        }),
      })

      const { GET } = await import("./route")
      const request = new NextRequest(`http://localhost/api/collections?orgId=${mockOrganization.id}`)
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.collections).toHaveLength(1)
      expect(json.collections[0].name).toBe("Org Collection")
    })

    it("returns 403 when user is not a member of organization", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      // No membership found
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })

      const { GET } = await import("./route")
      const request = new NextRequest(`http://localhost/api/collections?orgId=${mockOrganization.id}`)
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.error).toBe("You are not a member of this organization")
    })
  })

  describe("POST /api/collections", () => {
    it("returns 401 when not authenticated", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { POST } = await import("./route")
      const request = new NextRequest("http://localhost/api/collections", {
        method: "POST",
        body: JSON.stringify({ name: "New Collection" }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe("Unauthorized")
    })

    it("returns 400 when name is missing", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { POST } = await import("./route")
      const request = new NextRequest("http://localhost/api/collections", {
        method: "POST",
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe("Collection name is required")
    })

    it("creates collection when valid", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const newCollection = { ...mockCollection, name: "New Collection" }

      mockDbInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([newCollection]),
        }),
      })

      const { POST } = await import("./route")
      const request = new NextRequest("http://localhost/api/collections", {
        method: "POST",
        body: JSON.stringify({ name: "New Collection" }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(201)
      expect(json.collection.name).toBe("New Collection")
    })

    it("sets other collections to non-default when creating default", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const newCollection = { ...mockCollection, name: "Default Collection", isDefault: true }

      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })

      mockDbInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([newCollection]),
        }),
      })

      const { POST } = await import("./route")
      const request = new NextRequest("http://localhost/api/collections", {
        method: "POST",
        body: JSON.stringify({ name: "Default Collection", isDefault: true }),
      })

      const response = await POST(request)
      await response.json() // consume response body

      expect(response.status).toBe(201)
      expect(mockDbUpdate).toHaveBeenCalled()
    })

    it("creates organization collection when orgId provided and user is admin", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      // Check membership (user is owner)
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockOrgMembership]),
        }),
      })

      mockDbInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockOrgCollection]),
        }),
      })

      const { POST } = await import("./route")
      const request = new NextRequest("http://localhost/api/collections", {
        method: "POST",
        body: JSON.stringify({ name: "Org Collection", orgId: mockOrganization.id }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(201)
      expect(json.collection.name).toBe("Org Collection")
      expect(json.collection.orgId).toBe(mockOrganization.id)
    })

    it("returns 403 when creating org collection without membership", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      // No membership found
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })

      const { POST } = await import("./route")
      const request = new NextRequest("http://localhost/api/collections", {
        method: "POST",
        body: JSON.stringify({ name: "Org Collection", orgId: mockOrganization.id }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.error).toBe("You are not a member of this organization")
    })

    it("returns 403 when creating org collection as regular member", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      // User is just a member, not admin or owner
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ ...mockOrgMembership, role: "member" }]),
        }),
      })

      const { POST } = await import("./route")
      const request = new NextRequest("http://localhost/api/collections", {
        method: "POST",
        body: JSON.stringify({ name: "Org Collection", orgId: mockOrganization.id }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.error).toBe("Only admins and owners can create collections")
    })
  })
})

describe("Collection Detail API", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe("GET /api/collections/[id]", () => {
    it("returns 401 when not authenticated", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { GET } = await import("./[id]/route")
      const request = new NextRequest("http://localhost/api/collections/col-123")

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

      const { GET } = await import("./[id]/route")
      const request = new NextRequest("http://localhost/api/collections/col-not-found")

      const response = await GET(request, { params: Promise.resolve({ id: "col-not-found" }) })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toBe("Collection not found")
    })

    it("returns collection with listings count", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockCollection]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockListing, mockListing]),
          }),
        })

      const { GET } = await import("./[id]/route")
      const request = new NextRequest("http://localhost/api/collections/col-123")

      const response = await GET(request, { params: Promise.resolve({ id: "col-123" }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.collection.name).toBe("Test Collection")
      expect(json.collection.listingsCount).toBe(2)
    })
  })

  describe("PUT /api/collections/[id]", () => {
    it("returns 401 when not authenticated", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { PUT } = await import("./[id]/route")
      const request = new NextRequest("http://localhost/api/collections/col-123", {
        method: "PUT",
        body: JSON.stringify({ name: "Updated Collection" }),
      })

      const response = await PUT(request, { params: Promise.resolve({ id: "col-123" }) })
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

      const { PUT } = await import("./[id]/route")
      const request = new NextRequest("http://localhost/api/collections/col-not-found", {
        method: "PUT",
        body: JSON.stringify({ name: "Updated Collection" }),
      })

      const response = await PUT(request, { params: Promise.resolve({ id: "col-not-found" }) })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toBe("Collection not found")
    })

    it("updates collection successfully", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const updatedCollection = { ...mockCollection, name: "Updated Collection" }

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

      const { PUT } = await import("./[id]/route")
      const request = new NextRequest("http://localhost/api/collections/col-123", {
        method: "PUT",
        body: JSON.stringify({ name: "Updated Collection" }),
      })

      const response = await PUT(request, { params: Promise.resolve({ id: "col-123" }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.collection.name).toBe("Updated Collection")
    })

    it("returns 400 when empty name provided", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockCollection]),
        }),
      })

      const { PUT } = await import("./[id]/route")
      const request = new NextRequest("http://localhost/api/collections/col-123", {
        method: "PUT",
        body: JSON.stringify({ name: "   " }),
      })

      const response = await PUT(request, { params: Promise.resolve({ id: "col-123" }) })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe("Collection name cannot be empty")
    })
  })

  describe("DELETE /api/collections/[id]", () => {
    it("returns 401 when not authenticated", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { DELETE } = await import("./[id]/route")
      const request = new NextRequest("http://localhost/api/collections/col-123", {
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

      const { DELETE } = await import("./[id]/route")
      const request = new NextRequest("http://localhost/api/collections/col-not-found", {
        method: "DELETE",
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: "col-not-found" }) })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toBe("Collection not found")
    })

    it("prevents deletion of only default collection", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const defaultCollection = { ...mockCollection, isDefault: true }

      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([defaultCollection]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([defaultCollection]),
          }),
        })

      const { DELETE } = await import("./[id]/route")
      const request = new NextRequest("http://localhost/api/collections/col-123", {
        method: "DELETE",
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: "col-123" }) })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe("Cannot delete the only default collection")
    })

    it("deletes collection successfully", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockCollection]),
        }),
      })

      mockDbDelete.mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      })

      const { DELETE } = await import("./[id]/route")
      const request = new NextRequest("http://localhost/api/collections/col-123", {
        method: "DELETE",
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: "col-123" }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
    })
  })
})

describe("Collection Listings API", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe("GET /api/collections/[id]/listings", () => {
    it("returns 401 when not authenticated", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { GET } = await import("./[id]/listings/route")
      const request = new NextRequest("http://localhost/api/collections/col-123/listings")

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

      const { GET } = await import("./[id]/listings/route")
      const request = new NextRequest("http://localhost/api/collections/col-not-found/listings")

      const response = await GET(request, { params: Promise.resolve({ id: "col-not-found" }) })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toBe("Collection not found")
    })

    it("returns listings for collection", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockCollection]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([mockListing]),
            }),
          }),
        })

      const { GET } = await import("./[id]/listings/route")
      const request = new NextRequest("http://localhost/api/collections/col-123/listings")

      const response = await GET(request, { params: Promise.resolve({ id: "col-123" }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.listings).toHaveLength(1)
      expect(json.listings[0].data.titulo).toBe("Test Listing")
    })
  })

  describe("POST /api/collections/[id]/listings", () => {
    it("returns 401 when not authenticated", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { POST } = await import("./[id]/listings/route")
      const request = new NextRequest("http://localhost/api/collections/col-123/listings", {
        method: "POST",
        body: JSON.stringify({ data: mockListing.data }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: "col-123" }) })
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe("Unauthorized")
    })

    it("returns 400 when data is missing", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { POST } = await import("./[id]/listings/route")
      const request = new NextRequest("http://localhost/api/collections/col-123/listings", {
        method: "POST",
        body: JSON.stringify({}),
      })

      const response = await POST(request, { params: Promise.resolve({ id: "col-123" }) })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe("Listing data is required")
    })

    it("returns 400 when title is missing", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { POST } = await import("./[id]/listings/route")
      const request = new NextRequest("http://localhost/api/collections/col-123/listings", {
        method: "POST",
        body: JSON.stringify({ data: { endereco: "Test Address" } }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: "col-123" }) })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe("Listing title is required")
    })

    it("creates listing successfully", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockCollection]),
        }),
      })

      mockDbInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockListing]),
        }),
      })

      const { POST } = await import("./[id]/listings/route")
      const request = new NextRequest("http://localhost/api/collections/col-123/listings", {
        method: "POST",
        body: JSON.stringify({ data: mockListing.data }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: "col-123" }) })
      const json = await response.json()

      expect(response.status).toBe(201)
      expect(json.listing.data.titulo).toBe("Test Listing")
    })
  })
})

describe("Individual Listing API", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe("GET /api/collections/[id]/listings/[listingId]", () => {
    it("returns 401 when not authenticated", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { GET } = await import("./[id]/listings/[listingId]/route")
      const request = new NextRequest("http://localhost/api/collections/col-123/listings/listing-123")

      const response = await GET(request, {
        params: Promise.resolve({ id: "col-123", listingId: "listing-123" }),
      })
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe("Unauthorized")
    })

    it("returns 404 when listing not found", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockCollection]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        })

      const { GET } = await import("./[id]/listings/[listingId]/route")
      const request = new NextRequest("http://localhost/api/collections/col-123/listings/not-found")

      const response = await GET(request, {
        params: Promise.resolve({ id: "col-123", listingId: "not-found" }),
      })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toBe("Listing not found")
    })

    it("returns listing successfully", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockCollection]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockListing]),
          }),
        })

      const { GET } = await import("./[id]/listings/[listingId]/route")
      const request = new NextRequest("http://localhost/api/collections/col-123/listings/listing-123")

      const response = await GET(request, {
        params: Promise.resolve({ id: "col-123", listingId: "listing-123" }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.listing.data.titulo).toBe("Test Listing")
    })
  })

  describe("PUT /api/collections/[id]/listings/[listingId]", () => {
    it("returns 401 when not authenticated", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { PUT } = await import("./[id]/listings/[listingId]/route")
      const request = new NextRequest("http://localhost/api/collections/col-123/listings/listing-123", {
        method: "PUT",
        body: JSON.stringify({ data: { preco: 600000 } }),
      })

      const response = await PUT(request, {
        params: Promise.resolve({ id: "col-123", listingId: "listing-123" }),
      })
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe("Unauthorized")
    })

    it("returns 400 when no data provided", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { PUT } = await import("./[id]/listings/[listingId]/route")
      const request = new NextRequest("http://localhost/api/collections/col-123/listings/listing-123", {
        method: "PUT",
        body: JSON.stringify({}),
      })

      const response = await PUT(request, {
        params: Promise.resolve({ id: "col-123", listingId: "listing-123" }),
      })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe("Update data is required")
    })

    it("updates listing successfully", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const updatedListing = {
        ...mockListing,
        data: { ...mockListing.data, preco: 600000 },
      }

      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockCollection]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockListing]),
          }),
        })

      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedListing]),
          }),
        }),
      })

      const { PUT } = await import("./[id]/listings/[listingId]/route")
      const request = new NextRequest("http://localhost/api/collections/col-123/listings/listing-123", {
        method: "PUT",
        body: JSON.stringify({ data: { preco: 600000 } }),
      })

      const response = await PUT(request, {
        params: Promise.resolve({ id: "col-123", listingId: "listing-123" }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.listing.data.preco).toBe(600000)
    })
  })

  describe("DELETE /api/collections/[id]/listings/[listingId]", () => {
    it("returns 401 when not authenticated", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { DELETE } = await import("./[id]/listings/[listingId]/route")
      const request = new NextRequest("http://localhost/api/collections/col-123/listings/listing-123", {
        method: "DELETE",
      })

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "col-123", listingId: "listing-123" }),
      })
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe("Unauthorized")
    })

    it("returns 404 when listing not found", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockCollection]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        })

      const { DELETE } = await import("./[id]/listings/[listingId]/route")
      const request = new NextRequest("http://localhost/api/collections/col-123/listings/not-found", {
        method: "DELETE",
      })

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "col-123", listingId: "not-found" }),
      })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toBe("Listing not found")
    })

    it("deletes listing successfully", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockCollection]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockListing]),
          }),
        })

      mockDbDelete.mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      })

      const { DELETE } = await import("./[id]/listings/[listingId]/route")
      const request = new NextRequest("http://localhost/api/collections/col-123/listings/listing-123", {
        method: "DELETE",
      })

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "col-123", listingId: "listing-123" }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
    })
  })
})
