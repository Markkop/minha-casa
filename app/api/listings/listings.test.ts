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
  collections: { userId: "userId", id: "id" },
  listings: { collectionId: "collectionId", id: "id" },
}))

describe("Listings API - POST /api/listings", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("returns 401 when not authenticated", async () => {
    const { getServerSession } = await import("@/lib/auth-server")
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { POST } = await import("./route")
    const request = new NextRequest("http://localhost/api/listings", {
      method: "POST",
      body: JSON.stringify({ collectionId: "col-123", data: mockListing.data }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(401)
    expect(json.error).toBe("Authentication required")
    expect(json.code).toBe("UNAUTHORIZED")
  })

  it("returns 400 when collectionId is missing", async () => {
    const { getServerSession } = await import("@/lib/auth-server")
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    const { POST } = await import("./route")
    const request = new NextRequest("http://localhost/api/listings", {
      method: "POST",
      body: JSON.stringify({ data: mockListing.data }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe("Collection ID is required")
  })

  it("returns 400 when data is missing", async () => {
    const { getServerSession } = await import("@/lib/auth-server")
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    const { POST } = await import("./route")
    const request = new NextRequest("http://localhost/api/listings", {
      method: "POST",
      body: JSON.stringify({ collectionId: "col-123" }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe("Listing data is required")
  })

  it("returns 400 when title is missing", async () => {
    const { getServerSession } = await import("@/lib/auth-server")
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    const { POST } = await import("./route")
    const request = new NextRequest("http://localhost/api/listings", {
      method: "POST",
      body: JSON.stringify({
        collectionId: "col-123",
        data: { endereco: "Test Address" },
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe("Listing title is required")
  })

  it("returns 400 when address is missing", async () => {
    const { getServerSession } = await import("@/lib/auth-server")
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    const { POST } = await import("./route")
    const request = new NextRequest("http://localhost/api/listings", {
      method: "POST",
      body: JSON.stringify({
        collectionId: "col-123",
        data: { titulo: "Test Title" },
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe("Listing address is required")
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
    const request = new NextRequest("http://localhost/api/listings", {
      method: "POST",
      body: JSON.stringify({
        collectionId: "col-not-found",
        data: mockListing.data,
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(404)
    expect(json.error).toBe("Collection not found")
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

    const { POST } = await import("./route")
    const request = new NextRequest("http://localhost/api/listings", {
      method: "POST",
      body: JSON.stringify({
        collectionId: "col-123",
        data: mockListing.data,
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(201)
    expect(json.listing.data.titulo).toBe("Test Listing")
  })
})

describe("Listings API - GET /api/listings/[id]", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("returns 401 when not authenticated", async () => {
    const { getServerSession } = await import("@/lib/auth-server")
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { GET } = await import("./[id]/route")
    const request = new NextRequest("http://localhost/api/listings/listing-123")

    const response = await GET(request, {
      params: Promise.resolve({ id: "listing-123" }),
    })
    const json = await response.json()

    expect(response.status).toBe(401)
    expect(json.error).toBe("Authentication required")
    expect(json.code).toBe("UNAUTHORIZED")
  })

  it("returns 404 when listing not found", async () => {
    const { getServerSession } = await import("@/lib/auth-server")
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    })

    const { GET } = await import("./[id]/route")
    const request = new NextRequest("http://localhost/api/listings/not-found")

    const response = await GET(request, {
      params: Promise.resolve({ id: "not-found" }),
    })
    const json = await response.json()

    expect(response.status).toBe(404)
    expect(json.error).toBe("Listing not found")
  })

  it("returns 404 when listing belongs to another user", async () => {
    const { getServerSession } = await import("@/lib/auth-server")
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    mockDbSelect
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockListing]),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]), // No collection found (wrong user)
        }),
      })

    const { GET } = await import("./[id]/route")
    const request = new NextRequest("http://localhost/api/listings/listing-123")

    const response = await GET(request, {
      params: Promise.resolve({ id: "listing-123" }),
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
          where: vi.fn().mockResolvedValue([mockListing]),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockCollection]),
        }),
      })

    const { GET } = await import("./[id]/route")
    const request = new NextRequest("http://localhost/api/listings/listing-123")

    const response = await GET(request, {
      params: Promise.resolve({ id: "listing-123" }),
    })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.listing.data.titulo).toBe("Test Listing")
  })
})

describe("Listings API - PUT /api/listings/[id]", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("returns 401 when not authenticated", async () => {
    const { getServerSession } = await import("@/lib/auth-server")
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { PUT } = await import("./[id]/route")
    const request = new NextRequest("http://localhost/api/listings/listing-123", {
      method: "PUT",
      body: JSON.stringify({ data: { preco: 600000 } }),
    })

    const response = await PUT(request, {
      params: Promise.resolve({ id: "listing-123" }),
    })
    const json = await response.json()

    expect(response.status).toBe(401)
    expect(json.error).toBe("Authentication required")
    expect(json.code).toBe("UNAUTHORIZED")
  })

  it("returns 400 when no data provided", async () => {
    const { getServerSession } = await import("@/lib/auth-server")
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    const { PUT } = await import("./[id]/route")
    const request = new NextRequest("http://localhost/api/listings/listing-123", {
      method: "PUT",
      body: JSON.stringify({}),
    })

    const response = await PUT(request, {
      params: Promise.resolve({ id: "listing-123" }),
    })
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe("Update data is required")
  })

  it("returns 404 when listing not found", async () => {
    const { getServerSession } = await import("@/lib/auth-server")
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    })

    const { PUT } = await import("./[id]/route")
    const request = new NextRequest("http://localhost/api/listings/not-found", {
      method: "PUT",
      body: JSON.stringify({ data: { preco: 600000 } }),
    })

    const response = await PUT(request, {
      params: Promise.resolve({ id: "not-found" }),
    })
    const json = await response.json()

    expect(response.status).toBe(404)
    expect(json.error).toBe("Listing not found")
  })

  it("returns 404 when listing belongs to another user", async () => {
    const { getServerSession } = await import("@/lib/auth-server")
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    mockDbSelect
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockListing]),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]), // No collection found (wrong user)
        }),
      })

    const { PUT } = await import("./[id]/route")
    const request = new NextRequest("http://localhost/api/listings/listing-123", {
      method: "PUT",
      body: JSON.stringify({ data: { preco: 600000 } }),
    })

    const response = await PUT(request, {
      params: Promise.resolve({ id: "listing-123" }),
    })
    const json = await response.json()

    expect(response.status).toBe(404)
    expect(json.error).toBe("Listing not found")
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
          where: vi.fn().mockResolvedValue([mockListing]),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockCollection]),
        }),
      })

    mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updatedListing]),
        }),
      }),
    })

    const { PUT } = await import("./[id]/route")
    const request = new NextRequest("http://localhost/api/listings/listing-123", {
      method: "PUT",
      body: JSON.stringify({ data: { preco: 600000 } }),
    })

    const response = await PUT(request, {
      params: Promise.resolve({ id: "listing-123" }),
    })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.listing.data.preco).toBe(600000)
  })

  it("merges data correctly when updating partial fields", async () => {
    const { getServerSession } = await import("@/lib/auth-server")
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    const updatedListing = {
      ...mockListing,
      data: { ...mockListing.data, starred: true },
    }

    mockDbSelect
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockListing]),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockCollection]),
        }),
      })

    mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updatedListing]),
        }),
      }),
    })

    const { PUT } = await import("./[id]/route")
    const request = new NextRequest("http://localhost/api/listings/listing-123", {
      method: "PUT",
      body: JSON.stringify({ data: { starred: true } }),
    })

    const response = await PUT(request, {
      params: Promise.resolve({ id: "listing-123" }),
    })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.listing.data.starred).toBe(true)
    expect(json.listing.data.titulo).toBe("Test Listing") // Original data preserved
  })
})

describe("Listings API - DELETE /api/listings/[id]", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("returns 401 when not authenticated", async () => {
    const { getServerSession } = await import("@/lib/auth-server")
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { DELETE } = await import("./[id]/route")
    const request = new NextRequest("http://localhost/api/listings/listing-123", {
      method: "DELETE",
    })

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "listing-123" }),
    })
    const json = await response.json()

    expect(response.status).toBe(401)
    expect(json.error).toBe("Authentication required")
    expect(json.code).toBe("UNAUTHORIZED")
  })

  it("returns 404 when listing not found", async () => {
    const { getServerSession } = await import("@/lib/auth-server")
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    })

    const { DELETE } = await import("./[id]/route")
    const request = new NextRequest("http://localhost/api/listings/not-found", {
      method: "DELETE",
    })

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "not-found" }),
    })
    const json = await response.json()

    expect(response.status).toBe(404)
    expect(json.error).toBe("Listing not found")
  })

  it("returns 404 when listing belongs to another user", async () => {
    const { getServerSession } = await import("@/lib/auth-server")
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    mockDbSelect
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockListing]),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]), // No collection found (wrong user)
        }),
      })

    const { DELETE } = await import("./[id]/route")
    const request = new NextRequest("http://localhost/api/listings/listing-123", {
      method: "DELETE",
    })

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "listing-123" }),
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
          where: vi.fn().mockResolvedValue([mockListing]),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockCollection]),
        }),
      })

    mockDbDelete.mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    })

    const { DELETE } = await import("./[id]/route")
    const request = new NextRequest("http://localhost/api/listings/listing-123", {
      method: "DELETE",
    })

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "listing-123" }),
    })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
  })
})
