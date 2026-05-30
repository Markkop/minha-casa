import { describe, expect, it } from "vitest"
import { shouldNavigateToAnunciosOnCollectionSelect } from "./collection-breadcrumb-navigation"

describe("shouldNavigateToAnunciosOnCollectionSelect", () => {
  it("returns true when re-selecting active collection off anúncios", () => {
    expect(
      shouldNavigateToAnunciosOnCollectionSelect("/analise", "coll-1", "coll-1")
    ).toBe(true)
  })

  it("returns false on anúncios", () => {
    expect(
      shouldNavigateToAnunciosOnCollectionSelect("/anuncios", "coll-1", "coll-1")
    ).toBe(false)
  })

  it("returns false when selecting a different collection", () => {
    expect(
      shouldNavigateToAnunciosOnCollectionSelect("/analise", "coll-1", "coll-2")
    ).toBe(false)
  })
})
