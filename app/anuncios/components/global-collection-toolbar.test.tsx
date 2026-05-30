import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { GlobalCollectionBreadcrumb } from "./global-collection-toolbar"
import type { Collection } from "../lib/api"

const mockPush = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/analise",
}))

const activeCollection: Collection = {
  id: "coll-1",
  label: "Minha coleção",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  isDefault: true,
}

vi.mock("../lib/use-collections", () => ({
  useCollections: () => ({
    collections: [activeCollection],
    activeCollection,
    isLoading: false,
    listings: [],
    setActiveCollection: vi.fn(),
    setDefaultCollection: vi.fn(),
    triggerRefresh: vi.fn(),
  }),
}))

vi.mock("./collection-modal", () => ({
  CollectionModal: () => null,
}))

describe("GlobalCollectionBreadcrumb", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it("renders collection breadcrumb for personal-only users", async () => {
    render(<GlobalCollectionBreadcrumb />)

    await waitFor(() => {
      expect(screen.getByTestId("global-collection-breadcrumb")).toBeInTheDocument()
    })
    expect(screen.getByText("Minha coleção")).toBeInTheDocument()
  })
})
