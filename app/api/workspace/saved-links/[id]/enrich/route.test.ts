import { describe, expect, it, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/auth-server", () => ({
  getServerSession: vi.fn(async () => ({ user: { id: "user-1" } })),
}))

vi.mock("@/lib/workspace/profile", () => ({
  getWorkspaceProfile: vi.fn(async () => ({
    userId: "user-1",
    orgId: null,
  })),
}))

const mockProxy = vi.fn()

vi.mock("@/lib/backend-api", () => ({
  proxyBackendRequest: (...args: unknown[]) => mockProxy(...args),
}))

describe("POST /api/workspace/saved-links/[id]/enrich", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("proxies enrich to Phoenix and returns updated link", async () => {
    mockProxy.mockResolvedValue(
      new Response(
        JSON.stringify({
          link: {
            id: "link-1",
            title: "VivaReal - Aptos 3-4 quartos em Florianópolis",
            url: "https://www.vivareal.com.br/search",
            description: "Busca de apartamentos de 3 a 4 quartos, em Florianópolis.",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    )

    const { POST } = await import("./route")
    const response = await POST(
      new NextRequest("http://localhost/api/workspace/saved-links/link-1/enrich", {
        method: "POST",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "link-1" }) }
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.link.title).toContain("VivaReal")
    expect(mockProxy).toHaveBeenCalledWith(
      "/api/saved-links/link-1/enrich",
      expect.objectContaining({ method: "POST", userId: "user-1" })
    )
  })
})
