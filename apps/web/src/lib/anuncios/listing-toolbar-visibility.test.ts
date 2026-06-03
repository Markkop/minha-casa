import { describe, expect, it } from "vitest";
import { computeListingToolbarVisibility } from "./listing-toolbar-visibility";

describe("computeListingToolbarVisibility", () => {
  it("shows full toolbar hints when list is empty", () => {
    expect(computeListingToolbarVisibility([])).toEqual({
      showTipoImovel: true,
      showPiscina: true,
      showVistaLivre: true
    });
  });

  it("hides tipo when all visible listings share the same type", () => {
    expect(
      computeListingToolbarVisibility([
        { tipoImovel: "casa", piscina: false, vistaLivre: false },
        { tipoImovel: "casa", piscina: true, vistaLivre: false }
      ])
    ).toEqual({
      showTipoImovel: false,
      showPiscina: true,
      showVistaLivre: false
    });
  });

  it("shows tipo when types differ", () => {
    expect(
      computeListingToolbarVisibility([
        { tipoImovel: "casa", piscina: false, vistaLivre: false },
        { tipoImovel: "apartamento", piscina: false, vistaLivre: false }
      ])
    ).toEqual({
      showTipoImovel: true,
      showPiscina: false,
      showVistaLivre: false
    });
  });

  it("hides piscina when all listings have the same pool flag", () => {
    expect(
      computeListingToolbarVisibility([
        { tipoImovel: "casa", piscina: true, vistaLivre: false },
        { tipoImovel: "casa", piscina: true, vistaLivre: false }
      ])
    ).toEqual({
      showTipoImovel: false,
      showPiscina: false,
      showVistaLivre: false
    });
  });

  it("treats null and false as no pool for uniformity", () => {
    expect(
      computeListingToolbarVisibility([
        { tipoImovel: "casa", piscina: null, vistaLivre: null },
        { tipoImovel: "casa", piscina: false, vistaLivre: false }
      ])
    ).toEqual({
      showTipoImovel: false,
      showPiscina: false,
      showVistaLivre: false
    });
  });

  it("hides vista livre when all listings lack it", () => {
    expect(
      computeListingToolbarVisibility([
        { tipoImovel: "casa", piscina: false, vistaLivre: null },
        { tipoImovel: "casa", piscina: false, vistaLivre: false }
      ])
    ).toMatchObject({ showVistaLivre: false });
  });

  it("shows vista livre when at least one listing differs", () => {
    expect(
      computeListingToolbarVisibility([
        { tipoImovel: "casa", piscina: false, vistaLivre: false },
        { tipoImovel: "casa", piscina: false, vistaLivre: true }
      ])
    ).toMatchObject({ showVistaLivre: true });
  });
});
