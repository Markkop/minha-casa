import { describe, expect, it } from "vitest";
import { truncateListingTitle } from "$lib/components/listings/listing-title-display";

describe("truncateListingTitle", () => {
  it("truncates long titles with ellipsis", () => {
    expect(truncateListingTitle("a".repeat(60), 50)).toHaveLength(53);
  });
});
