import { describe, it, expect } from "vitest"
import { buildListingAnaliseHref } from "./listing-analise-url"

describe("buildListingAnaliseHref", () => {
  it("builds href with collection and listing", () => {
    expect(buildListingAnaliseHref("listing-2", "collection-1")).toBe(
      "/analise?collection=collection-1&listing=listing-2"
    )
  })

  it("builds href with listing only when no collection", () => {
    expect(buildListingAnaliseHref("listing-2")).toBe("/analise?listing=listing-2")
  })

  it("includes extra search params", () => {
    expect(
      buildListingAnaliseHref("listing-2", "collection-1", { view: "map" })
    ).toBe("/analise?collection=collection-1&listing=listing-2&view=map")
  })
})
