import { describe, expect, it } from "vitest";
import { ADDONS_CATALOG } from "./addons-catalog";

describe("ADDONS_CATALOG", () => {
  it("lists three addons with expected routes and titles", () => {
    expect(ADDONS_CATALOG).toHaveLength(3);
    expect(ADDONS_CATALOG.map((entry) => entry.href)).toEqual([
      "/floodrisk",
      "/planta",
      "/financiamento"
    ]);
    expect(ADDONS_CATALOG.map((entry) => entry.title)).toEqual([
      "Risco de alagamento",
      "Planta",
      "Financiamento"
    ]);
  });
});
