import { describe, expect, it } from "vitest";
import { layoutListingMobileFeatureRows } from "./listing-mobile-feature-layout";

function feature(key: string, label = key) {
  return { key, label };
}

function rowKeys(features: ReturnType<typeof feature>[]) {
  return layoutListingMobileFeatureRows(features).map(([left, right]) => [
    left?.key ?? null,
    right?.key ?? null
  ]);
}

function rowHasTwoMultiWord(
  rows: ReturnType<typeof layoutListingMobileFeatureRows>,
  features: ReturnType<typeof feature>[]
) {
  const labelByKey = new Map(features.map((item) => [item.key, item.label]));
  const isMulti = (key: string | null) =>
    key !== null && (labelByKey.get(key)?.trim().split(/\s+/).length ?? 0) > 1;

  return rows.some(([left, right]) => isMulti(left?.key ?? null) && isMulti(right?.key ?? null));
}

describe("layoutListingMobileFeatureRows", () => {
  it("fills single-word features right column first, then left column", () => {
    expect(rowKeys([])).toEqual([]);

    expect(rowKeys([feature("a")])).toEqual([[null, "a"]]);

    expect(rowKeys([feature("a"), feature("b")])).toEqual([
      [null, "a"],
      [null, "b"]
    ]);

    expect(rowKeys([feature("a"), feature("b"), feature("c")])).toEqual([
      ["c", "a"],
      [null, "b"]
    ]);

    expect(rowKeys([feature("a"), feature("b"), feature("c"), feature("d")])).toEqual([
      ["c", "a"],
      ["d", "b"]
    ]);
  });

  it("pairs multi-word features with single-word ones in the same row", () => {
    const features = [
      feature("pool", "Piscina"),
      feature("heatedPool", "Piscina térmica"),
      feature("gym", "Academia"),
      feature("doorman24h", "Portaria"),
      feature("unobstructedView", "Vista livre")
    ];

    const rows = layoutListingMobileFeatureRows(features);

    expect(rowKeys(features)).toEqual([
      ["heatedPool", "pool"],
      ["unobstructedView", "gym"],
      [null, "doorman24h"]
    ]);
    expect(rowHasTwoMultiWord(rows, features)).toBe(false);
  });
});
