import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { AdminClient } from "./admin-client"

// Mock next/navigation
const mockPush = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Store original fetch
const originalFetch = global.fetch

describe("AdminClient", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it("shows loading state initially", () => {
    global.fetch = vi.fn(() => new Promise(() => {})) as typeof fetch // Never resolves

    render(<AdminClient />)

    expect(screen.getByText(/carregando/i)).toBeInTheDocument()
  })

  it("redirects to home when user is not authorized (401)", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: "Unauthorized" }),
      } as Response)
    ) as typeof fetch

    render(<AdminClient />)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/")
    })
  })

  it("redirects to home when user is not admin (403)", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ error: "Forbidden" }),
      } as Response)
    ) as typeof fetch

    render(<AdminClient />)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/")
    })
  })

  it("shows error state and retry button when fetch fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error")) as typeof fetch

    render(<AdminClient />)

    await waitFor(() => {
      expect(screen.getByText(/tentar novamente/i)).toBeInTheDocument()
    })
  })
})
