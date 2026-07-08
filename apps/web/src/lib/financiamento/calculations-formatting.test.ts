import { describe, expect, it } from "vitest";
import { formatCurrencyCompact } from "./calculations";

describe("formatCurrencyCompact", () => {
  it("uses compact labels for positive and negative thousands", () => {
    expect(formatCurrencyCompact(1_200)).toBe("R$ 1.2k");
    expect(formatCurrencyCompact(1_250)).toBe("R$ 1.25k");
    expect(formatCurrencyCompact(10_000)).toBe("R$ 10k");
    expect(formatCurrencyCompact(-10_000)).toBe("-R$ 10k");
  });

  it("uses compact labels for positive and negative millions", () => {
    expect(formatCurrencyCompact(1_250_000)).toBe("R$ 1.25M");
    expect(formatCurrencyCompact(-1_250_000)).toBe("-R$ 1.25M");
  });
});
