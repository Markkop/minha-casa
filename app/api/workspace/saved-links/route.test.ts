import { describe, expect, it, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

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
  savedLinks: {
    id: "id",
    userId: "userId",
    orgId: "orgId",
    updatedAt: "updatedAt",
  },
}))

vi.mock("@/lib/workspace/profile", () => ({
  getWorkspaceProfile: vi.fn(async (orgId?: string | null) => ({
    userId: orgId ? null : "user-1",
    orgId: orgId ?? null,
  })),
  profileValues: vi.fn((profile: { userId: string | null; orgId: string | null }) => profile),
  profileWhere: vi.fn(() => "profileWhere"),
}))

describe("Workspace saved links API", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("lists links for the active profile", async () => {
    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([{ id: "link-1", title: "Busca", url: "https://example.com" }]),
        }),
      }),
    })

    const { GET } = await import("./route")
    const response = await GET(new NextRequest("http://localhost/api/workspace/saved-links?orgId=org-1"))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.links).toHaveLength(1)
  })

  it("creates a link quickly with hostname title when url only", async () => {
    const link = {
      id: "link-1",
      title: "example.com",
      url: "https://example.com",
      description: null,
    }
    mockDbInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([link]),
      }),
    })

    const { POST } = await import("./route")
    const response = await POST(new NextRequest("http://localhost/api/workspace/saved-links", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com" }),
    }))
    const json = await response.json()

    expect(response.status).toBe(201)
    expect(json.link.title).toBe("example.com")
    expect(json.link.description).toBeNull()
  })

  it("creates a link with explicit title without enrichment", async () => {
    const link = { id: "link-1", title: "Busca", url: "https://example.com", description: "Notas" }
    mockDbInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([link]),
      }),
    })

    const { POST } = await import("./route")
    const response = await POST(new NextRequest("http://localhost/api/workspace/saved-links", {
      method: "POST",
      body: JSON.stringify({ title: "Busca", url: "https://example.com", description: "Notas" }),
    }))
    const json = await response.json()

    expect(response.status).toBe(201)
    expect(json.link.title).toBe("Busca")
    expect(json.link.description).toBe("Notas")
  })

  it("rejects invalid URLs", async () => {
    const { POST } = await import("./route")
    const response = await POST(new NextRequest("http://localhost/api/workspace/saved-links", {
      method: "POST",
      body: JSON.stringify({ title: "Busca", url: "not-a-url" }),
    }))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe("URL must be valid")
  })
})
