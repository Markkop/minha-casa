import { describe, expect, it } from "vitest";
import { layoutListingMobileAmenityRows } from "./listing-mobile-amenity-layout";

function amenity(key: string, label = key) {
  return { key, label };
}

function rowKeys(amenities: ReturnType<typeof amenity>[]) {
  return layoutListingMobileAmenityRows(amenities).map(([left, right]) => [
    left?.key ?? null,
    right?.key ?? null
  ]);
}

function rowHasTwoMultiWord(
  rows: ReturnType<typeof layoutListingMobileAmenityRows>,
  amenities: ReturnType<typeof amenity>[]
) {
  const labelByKey = new Map(amenities.map((item) => [item.key, item.label]));
  const isMulti = (key: string | null) =>
    key !== null && (labelByKey.get(key)?.trim().split(/\s+/).length ?? 0) > 1;

  return rows.some(([left, right]) => isMulti(left?.key ?? null) && isMulti(right?.key ?? null));
}

describe("layoutListingMobileAmenityRows", () => {
  it("fills single-word amenities right column first, then left column", () => {
    expect(rowKeys([])).toEqual([]);

    expect(rowKeys([amenity("a")])).toEqual([[null, "a"]]);

    expect(rowKeys([amenity("a"), amenity("b")])).toEqual([
      [null, "a"],
      [null, "b"]
    ]);

    expect(rowKeys([amenity("a"), amenity("b"), amenity("c")])).toEqual([
      ["c", "a"],
      [null, "b"]
    ]);

    expect(rowKeys([amenity("a"), amenity("b"), amenity("c"), amenity("d")])).toEqual([
      ["c", "a"],
      ["d", "b"]
    ]);
  });

  it("pairs multi-word amenities with single-word ones in the same row", () => {
    const amenities = [
      amenity("piscina", "Piscina"),
      amenity("piscinaTermica", "Piscina térmica"),
      amenity("academia", "Academia"),
      amenity("porteiro24h", "Portaria"),
      amenity("vistaLivre", "Vista livre")
    ];

    const rows = layoutListingMobileAmenityRows(amenities);

    expect(rowKeys(amenities)).toEqual([
      ["piscinaTermica", "piscina"],
      ["vistaLivre", "academia"],
      [null, "porteiro24h"]
    ]);
    expect(rowHasTwoMultiWord(rows, amenities)).toBe(false);
  });
});
