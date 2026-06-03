import { describe, expect, it } from "vitest";
import { getListingCarouselOptions } from "$lib/carousel/listing-carousel-options";

describe("getListingCarouselOptions", () => {
  it("uses horizontal axis with loop for card preset", () => {
    const options = getListingCarouselOptions("card");
    expect(options.axis).toBe("x");
    expect(options.loop).toBe(true);
    expect(options.containScroll).toBeUndefined();
    expect(options.watchDrag).toBe(true);
  });

  it("does not enable watchDrag for modal preset", () => {
    const options = getListingCarouselOptions("modal", 2);
    expect(options.startIndex).toBe(2);
    expect(options.loop).toBe(true);
    expect(options.watchDrag).toBeUndefined();
  });

  it("enables loop for lightbox preset", () => {
    expect(getListingCarouselOptions("lightbox", 1).loop).toBe(true);
    expect(getListingCarouselOptions("lightbox", 1).startIndex).toBe(1);
  });
});
