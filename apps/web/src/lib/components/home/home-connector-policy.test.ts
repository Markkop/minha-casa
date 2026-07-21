import { describe, expect, it } from "vitest";
import { homeConnectorPolicy } from "$lib/components/home/home-connector-policy";

describe("home connector policy", () => {
  it("hides connectors at and below the desktop breakpoint", () => {
    expect(homeConnectorPolicy(719, false)).toEqual({ visible: false, animated: false });
    expect(homeConnectorPolicy(720, false)).toEqual({ visible: false, animated: false });
  });

  it("shows and animates connectors above the desktop breakpoint", () => {
    expect(homeConnectorPolicy(721, false)).toEqual({ visible: true, animated: true });
    expect(homeConnectorPolicy(1366, false)).toEqual({ visible: true, animated: true });
  });

  it("shows static connectors when reduced motion is enabled", () => {
    expect(homeConnectorPolicy(721, true)).toEqual({ visible: true, animated: false });
  });
});
