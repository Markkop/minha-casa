import { describe, expect, it } from "vitest";
import {
  computeListingPropertyColumnWidthPx,
  longestDisplayedTitle,
  LISTING_PROPERTY_COLUMN_MIN_PX,
  pendingReviewPropertyMinWidthPx
} from "$lib/components/listings/listing-table-column-layout";

describe("longestDisplayedTitle", () => {
  it("picks the longest truncated title", () => {
    expect(
      longestDisplayedTitle(["Short", `${"a".repeat(60)}`])
    ).toHaveLength(53);
  });
});

describe("computeListingPropertyColumnWidthPx", () => {
  it("adds actions and padding to text width", () => {
    expect(computeListingPropertyColumnWidthPx(200)).toBe(200 + 28 + 16);
  });

  it("respects minimum width", () => {
    expect(computeListingPropertyColumnWidthPx(0)).toBe(LISTING_PROPERTY_COLUMN_MIN_PX);
  });
});

describe("pendingReviewPropertyMinWidthPx", () => {
  it("caps at 70vw", () => {
    expect(pendingReviewPropertyMinWidthPx(1000)).toBe(560);
    expect(pendingReviewPropertyMinWidthPx(400)).toBe(280);
  });
});
