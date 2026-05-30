import { describe, expect, it } from "vitest"
import {
  resolveListingImages,
  syncListingImageFields,
  buildListingImagePath,
  buildSharedListingImagePath,
  resolveShareListingImages,
  isListingImageIngesting,
  isExternalListingImageUrl,
} from "./listing-images"

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

  it("uses the cover index as the resolved thumbnail", () => {
    const result = resolveListingImages({
      imageUrls: ["https://a.com/1.jpg", "https://a.com/2.jpg"],
      imageCoverIndex: 1,
    })

    expect(result.imageUrls).toEqual([
      "https://a.com/1.jpg",
      "https://a.com/2.jpg",
    ])
    expect(result.imageUrl).toBe("https://a.com/2.jpg")
  })

  it("falls back to imageUrl", () => {
    const result = resolveListingImages({
      imageUrl: "https://a.com/only.jpg",
    })
    expect(result.imageUrls).toEqual(["https://a.com/only.jpg"])
    expect(result.imageUrl).toBe("https://a.com/only.jpg")
  })

  it("builds hosted paths from storage keys", () => {
    const result = resolveListingImages({
      listingId: "abc-123",
      imageStorageKeys: ["listings/abc-123/0.jpg", "listings/abc-123/1.jpg"],
      imageCoverIndex: 1,
    })
    expect(result.imageUrls).toEqual([
      "/api/listings/abc-123/images/0",
      "/api/listings/abc-123/images/1",
    ])
    expect(result.imageUrl).toBe("/api/listings/abc-123/images/1")
  })
})

describe("resolveShareListingImages", () => {
  it("uses token-scoped paths for storage keys", () => {
    const result = resolveShareListingImages("tok", "lid", {
      imageStorageKeys: ["listings/lid/0.jpg", "listings/lid/1.jpg"],
      imageCoverIndex: 1,
    })
    expect(result.imageUrl).toBe("/api/shared/tok/listings/lid/images/1")
  })
})

describe("buildListingImagePath", () => {
  it("formats path", () => {
    expect(buildListingImagePath("x", 2)).toBe("/api/listings/x/images/2")
  })
})

describe("buildSharedListingImagePath", () => {
  it("formats share path", () => {
    expect(buildSharedListingImagePath("t", "x", 1)).toBe(
      "/api/shared/t/listings/x/images/1"
    )
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

describe("isListingImageIngesting", () => {
  it("detects pending and processing", () => {
    expect(isListingImageIngesting("pending")).toBe(true)
    expect(isListingImageIngesting("processing")).toBe(true)
    expect(isListingImageIngesting("ready")).toBe(false)
  })
})

describe("isExternalListingImageUrl", () => {
  it("flags external http urls", () => {
    expect(isExternalListingImageUrl("https://portal.com/img.jpg")).toBe(true)
    expect(isExternalListingImageUrl("/api/listings/a/images/0")).toBe(false)
  })
})
