import { describe, expect, it } from "vitest";
import {
  hasUnsavedListingEdits,
  listingEditSnapshot
} from "$lib/listings/listing-edit-dirty";

describe("listing edit dirty state", () => {
  it("keeps an unchanged form clean", () => {
    const form = {
      title: "Apartamento",
      address: "Rua das Flores, 42",
      features: { piscina: true }
    };

    expect(hasUnsavedListingEdits(form, listingEditSnapshot(form))).toBe(false);
  });

  it("detects scalar and nested edits", () => {
    const initial = {
      title: "Apartamento",
      address: "Rua das Flores, 42",
      features: { piscina: true }
    };
    const snapshot = listingEditSnapshot(initial);

    expect(hasUnsavedListingEdits({ ...initial, title: "Apartamento novo" }, snapshot)).toBe(true);
    expect(
      hasUnsavedListingEdits(
        { ...initial, features: { ...initial.features, piscina: false } },
        snapshot
      )
    ).toBe(true);
  });
});
