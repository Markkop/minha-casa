import { describe, expect, it } from "vitest";
import { getListingCarouselOptions } from "$lib/carousel/listing-carousel-options";

describe("getListingCarouselOptions", () => {
  it("uses horizontal axis without loop for card preset", () => {
    const options = getListingCarouselOptions("card");
    expect(options.axis).toBe("x");
    expect(options.loop).toBe(false);
    expect(options.containScroll).toBe("trimSnaps");
    expect(options.watchDrag).toBe(true);
  });

  it("does not enable watchDrag for modal preset", () => {
    const options = getListingCarouselOptions("modal", 2);
    expect(options.startIndex).toBe(2);
    expect(options.watchDrag).toBeUndefined();
  });
});
