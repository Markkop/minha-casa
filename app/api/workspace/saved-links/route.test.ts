import { describe, expect, it, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/auth-server", () => ({
  getServerSession: vi.fn(async () => ({ user: { id: "user-1" } })),
}))

vi.mock("@/lib/workspace/profile", () => ({
  getWorkspaceProfile: vi.fn(async (orgId?: string | null) => ({
    userId: orgId ? null : "user-1",
    orgId: orgId ?? null,
  })),
}))

const mockProxy = vi.fn()

vi.mock("@/lib/backend-api", () => ({
  proxyBackendRequest: (...args: unknown[]) => mockProxy(...args),
}))

describe("Workspace saved links API (BFF proxy)", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("lists links via Phoenix", async () => {
    mockProxy.mockResolvedValue(
      new Response(JSON.stringify({ links: [{ id: "link-1", title: "Busca", url: "https://example.com" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    const { GET } = await import("./route")
    const response = await GET(new NextRequest("http://localhost/api/workspace/saved-links?orgId=org-1"))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.links).toHaveLength(1)
    expect(mockProxy).toHaveBeenCalledWith(
      "/api/saved-links",
      expect.objectContaining({ method: "GET", userId: "user-1" })
    )
  })

  it("returns 503 when backend is not configured", async () => {
    mockProxy.mockResolvedValue(
      new Response(JSON.stringify({ error: "Backend API not configured" }), { status: 503 })
    )

    const { GET } = await import("./route")
    const response = await GET(new NextRequest("http://localhost/api/workspace/saved-links"))
    expect(response.status).toBe(503)
  })

  it("creates a link via Phoenix", async () => {
    mockProxy.mockResolvedValue(
      new Response(
        JSON.stringify({
          link: {
            id: "link-1",
            title: "example.com",
            url: "https://example.com",
            description: null,
          },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      )
    )

    const { POST } = await import("./route")
    const response = await POST(
      new NextRequest("http://localhost/api/workspace/saved-links", {
        method: "POST",
        body: JSON.stringify({ url: "https://example.com" }),
      })
    )
    const json = await response.json()

    expect(response.status).toBe(201)
    expect(json.link.title).toBe("example.com")
  })

  it("rejects invalid URLs from backend", async () => {
    mockProxy.mockResolvedValue(
      new Response(JSON.stringify({ error: "URL must be valid" }), { status: 400 })
    )

    const { POST } = await import("./route")
    const response = await POST(
      new NextRequest("http://localhost/api/workspace/saved-links", {
        method: "POST",
        body: JSON.stringify({ url: "not-a-url" }),
      })
    )
    expect(response.status).toBe(400)
  })
})
