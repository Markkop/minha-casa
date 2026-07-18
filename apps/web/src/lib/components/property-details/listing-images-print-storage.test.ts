import { describe, expect, it } from "vitest";
import {
  buildPrintItemsFromGallery,
  serializePrintItemsForStorage
} from "$lib/components/property-details/listing-images-print-storage";

describe("listing-images-print-storage", () => {
  const galleryImages = [
    { originalIndex: 0, url: "/api/listings/a/images/0" },
    { originalIndex: 1, url: "/api/listings/a/images/1" },
    { originalIndex: 2, url: "/api/listings/a/images/2" }
  ];

  it("returns defaults when no listing id is provided", () => {
    expect(buildPrintItemsFromGallery(galleryImages, null)).toEqual([
      { originalIndex: 0, url: "/api/listings/a/images/0", selected: true },
      { originalIndex: 1, url: "/api/listings/a/images/1", selected: true },
      { originalIndex: 2, url: "/api/listings/a/images/2", selected: true }
    ]);
  });

  it("serializes order and checkbox state", () => {
    const printItems = [
      { originalIndex: 2, url: "/api/listings/a/images/2", selected: false },
      { originalIndex: 0, url: "/api/listings/a/images/0", selected: true }
    ];

    expect(serializePrintItemsForStorage("sig", printItems)).toEqual({
      gallerySignature: "sig",
      order: [2, 0],
      selected: {
        "0": true,
        "2": false
      }
    });
  });
});
