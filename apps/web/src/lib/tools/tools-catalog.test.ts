import { describe, expect, it } from "vitest";
import { TOOLS_CATALOG } from "./tools-catalog";

describe("TOOLS_CATALOG", () => {
  it("lists the available tools without duplicating Financeiro", () => {
    expect(TOOLS_CATALOG).toHaveLength(2);
    expect(TOOLS_CATALOG.map((entry) => entry.id)).toEqual(["flood", "planta"]);
    expect(TOOLS_CATALOG.map((entry) => entry.href)).toEqual(["/floodrisk", "/planta"]);
    expect(TOOLS_CATALOG.map((entry) => entry.title)).toEqual([
      "Risco de alagamento",
      "Planta"
    ]);
  });
});
