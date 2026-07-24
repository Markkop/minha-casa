import { describe, expect, it } from "vitest";
import { computeMarkerCardPlacement } from "./marker-card-placement";

const CONTAINER = { width: 800, height: 400 };
const CARD = { width: 320, height: 120 };

describe("computeMarkerCardPlacement", () => {
  it("centers the card above a marker when there is room", () => {
    expect(
      computeMarkerCardPlacement({
        marker: { x: 400, y: 250, visible: true },
        container: CONTAINER,
        card: CARD
      })
    ).toEqual({
      left: 240,
      top: 118,
      side: "top",
      arrowLeft: 160,
      visible: true
    });
  });

  it("clamps the card at the left edge and keeps the arrow anchored to the marker", () => {
    const placement = computeMarkerCardPlacement({
      marker: { x: 40, y: 250, visible: true },
      container: CONTAINER,
      card: CARD
    });

    expect(placement.left).toBe(12);
    expect(placement.arrowLeft).toBe(28);
    expect(placement.side).toBe("top");
  });

  it("clamps the card at the right edge and keeps the arrow anchored to the marker", () => {
    const placement = computeMarkerCardPlacement({
      marker: { x: 760, y: 250, visible: true },
      container: CONTAINER,
      card: CARD
    });

    expect(placement.left).toBe(468);
    expect(placement.arrowLeft).toBe(292);
    expect(placement.side).toBe("top");
  });

  it("falls below a marker when the card does not fit above it", () => {
    expect(
      computeMarkerCardPlacement({
        marker: { x: 400, y: 80, visible: true },
        container: CONTAINER,
        card: CARD
      })
    ).toEqual({
      left: 240,
      top: 92,
      side: "bottom",
      arrowLeft: 160,
      visible: true
    });
  });

  it.each([
    ["hidden projection", { x: 400, y: 250, visible: false }],
    ["left of scene", { x: -1, y: 250, visible: true }],
    ["right of scene", { x: 801, y: 250, visible: true }],
    ["above scene", { x: 400, y: -1, visible: true }],
    ["below scene", { x: 400, y: 401, visible: true }]
  ])("hides the card for a %s marker", (_label, marker) => {
    expect(
      computeMarkerCardPlacement({ marker, container: CONTAINER, card: CARD })
    ).toEqual({
      left: 0,
      top: 0,
      side: "top",
      arrowLeft: 0,
      visible: false
    });
  });
});
