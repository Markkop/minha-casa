import { describe, expect, it } from "vitest";
import { DEFAULT_NEIGHBORHOOD_CENTER } from "./geo";
import { createProceduralNeighborhood } from "./procedural";

describe("procedural neighborhood fallback", () => {
  it("is deterministic, complete, and centered on the requested location", () => {
    const first = createProceduralNeighborhood(DEFAULT_NEIGHBORHOOD_CENTER);
    const second = createProceduralNeighborhood(DEFAULT_NEIGHBORHOOD_CENTER);

    expect(first).toEqual(second);
    expect(first.center).toBe(DEFAULT_NEIGHBORHOOD_CENTER);
    expect(first.place.neighborhood).toBe("Centro");
    expect(first.buildings).toHaveLength(36);
    expect(first.roads).toHaveLength(10);
    expect(first.areas).toHaveLength(1);
    expect(first.buildings.every((building) => building.polygon.length === 5)).toBe(true);
  });
});
