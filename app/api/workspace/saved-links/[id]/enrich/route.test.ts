import { describe, expect, it, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const mockDbSelect = vi.fn()
const mockDbUpdate = vi.fn()
const mockResolveSavedLinkMetadata = vi.fn()

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => ({
    select: mockDbSelect,
    update: mockDbUpdate,
  })),
  savedLinks: {
    id: "id",
    userId: "userId",
    orgId: "orgId",
  },
}))

vi.mock("@/lib/workspace/profile", () => ({
  getWorkspaceProfile: vi.fn(async () => ({
    userId: "user-1",
    orgId: null,
  })),
  profileWhere: vi.fn(() => "profileWhere"),
}))

vi.mock("@/lib/saved-link-enrichment", () => ({
  resolveSavedLinkMetadata: (...args: unknown[]) =>
    mockResolveSavedLinkMetadata(...args),
}))

describe("POST /api/workspace/saved-links/[id]/enrich", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolveSavedLinkMetadata.mockResolvedValue({
      title: "VivaReal - Aptos 3-4 quartos em Florianópolis",
      description: "Busca de apartamentos de 3 a 4 quartos, em Florianópolis.",
      path: "scrapingant",
    })
  })

  it("updates link with enriched metadata", async () => {
    const existing = {
      id: "link-1",
      title: "vivareal.com.br",
      url: "https://www.vivareal.com.br/search",
      description: null,
    }
    const updated = {
      ...existing,
      title: "VivaReal - Aptos 3-4 quartos em Florianópolis",
      description: "Busca de apartamentos de 3 a 4 quartos, em Florianópolis.",
    }

    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([existing]),
        }),
      }),
    })
    mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updated]),
        }),
      }),
    })

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
    expect(mockResolveSavedLinkMetadata).toHaveBeenCalledWith(existing.url)
    expect(json.link.title).toBe("VivaReal - Aptos 3-4 quartos em Florianópolis")
  })

  it("keeps existing title when enrichment throws", async () => {
    const existing = {
      id: "link-1",
      title: "example.com",
      url: "https://example.com",
      description: null,
    }

    mockResolveSavedLinkMetadata.mockRejectedValueOnce(new Error("openai down"))

    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([existing]),
        }),
      }),
    })
    mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([existing]),
        }),
      }),
    })

    const { POST } = await import("./route")
    const response = await POST(
      new NextRequest("http://localhost/api/workspace/saved-links/link-1/enrich", {
        method: "POST",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "link-1" }) }
    )

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.link.title).toBe("example.com")
  })
})
