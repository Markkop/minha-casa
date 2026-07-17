import { describe, expect, it } from "vitest";
import type { Imovel } from "./types";
import { formatListingForJsonExport, parseImportedListingData } from "./listing-json";

describe("construction year JSON import/export", () => {
  it("exports the construction year", () => {
    const exported = formatListingForJsonExport({
      id: "listing-1",
      titulo: "Casa",
      endereco: "Rua Teste",
      anoConstrucao: 1998
    } as Imovel);

    expect(exported.anoConstrucao).toBe(1998);
  });

  it("imports a valid construction year", () => {
    const imported = parseImportedListingData(
      { titulo: "Casa", endereco: "Rua Teste", anoConstrucao: 2004 },
      "2026-07-17"
    );

    expect(imported.anoConstrucao).toBe(2004);
  });

  it("imports missing or invalid years as null", () => {
    expect(
      parseImportedListingData({ titulo: "Casa", endereco: "Rua Teste" }).anoConstrucao
    ).toBeNull();
    expect(
      parseImportedListingData({
        titulo: "Casa",
        endereco: "Rua Teste",
        anoConstrucao: "2004"
      }).anoConstrucao
    ).toBeNull();
  });
});
