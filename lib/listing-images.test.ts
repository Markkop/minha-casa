import { describe, expect, it } from "vitest"
import { resolveListingImages, syncListingImageFields } from "./listing-images"

describe("resolveListingImages", () => {
  it("uses imageUrls when present", () => {
    const result = resolveListingImages({
      imageUrls: ["https://a.com/1.jpg", "https://a.com/2.jpg"],
      imageUrl: "https://old.com/x.jpg",
    })
    expect(result.imageUrls).toEqual([
      "https://a.com/1.jpg",
      "https://a.com/2.jpg",
    ])
    expect(result.imageUrl).toBe("https://a.com/1.jpg")
  })

  it("falls back to imageUrl", () => {
    const result = resolveListingImages({
      imageUrl: "https://a.com/only.jpg",
    })
    expect(result.imageUrls).toEqual(["https://a.com/only.jpg"])
    expect(result.imageUrl).toBe("https://a.com/only.jpg")
  })
})

describe("syncListingImageFields", () => {
  it("syncs thumbnail to first url", () => {
    const result = syncListingImageFields([
      " https://a.com/1.jpg ",
      "",
      "https://a.com/2.jpg",
    ])
    expect(result.imageUrls).toEqual([
      "https://a.com/1.jpg",
      "https://a.com/2.jpg",
    ])
    expect(result.imageUrl).toBe("https://a.com/1.jpg")
  })
})
