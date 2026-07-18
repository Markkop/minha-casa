import { describe, expect, it } from "vitest";
import type { Property } from "./types";
import { formatListingForJsonExport, parseImportedListingData } from "./listing-json";

describe("construction year JSON import/export", () => {
  it("exports the construction year", () => {
    const exported = formatListingForJsonExport({
      id: "listing-1",
      title: "Casa",
      address: "Rua Teste",
      constructionYear: 1998
    } as Property);

    expect(exported.constructionYear).toBe(1998);
  });

  it("imports a valid construction year", () => {
    const imported = parseImportedListingData(
      { title: "Casa", address: "Rua Teste", constructionYear: 2004 },
      "2026-07-17"
    );

    expect(imported.constructionYear).toBe(2004);
  });

  it("imports missing or invalid years as null", () => {
    expect(
      parseImportedListingData({ title: "Casa", address: "Rua Teste" }).constructionYear
    ).toBeNull();
    expect(
      parseImportedListingData({
        title: "Casa",
        address: "Rua Teste",
        constructionYear: "2004"
      }).constructionYear
    ).toBeNull();
  });
});
