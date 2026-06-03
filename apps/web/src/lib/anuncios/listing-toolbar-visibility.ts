import type { Imovel } from "$lib/anuncios/types";

type TipoImovelValue = "casa" | "apartamento" | null;

function normalizeTipoImovel(value: Imovel["tipoImovel"]): TipoImovelValue {
  if (value === "casa" || value === "apartamento") return value;
  return null;
}

export type ListingToolbarVisibility = {
  showTipoImovel: boolean;
  showPiscina: boolean;
  showVistaLivre: boolean;
};

export const DEFAULT_LISTING_TOOLBAR_VISIBILITY: ListingToolbarVisibility = {
  showTipoImovel: true,
  showPiscina: true,
  showVistaLivre: true
};

/** Edit dialog shows every toolbar control regardless of list uniformity. */
export const EDIT_MODAL_TOOLBAR_VISIBILITY: ListingToolbarVisibility = {
  showTipoImovel: true,
  showPiscina: true,
  showVistaLivre: true
};

function hasPiscina(listing: Pick<Imovel, "piscina">): boolean {
  return listing.piscina === true;
}

function hasVistaLivre(listing: Pick<Imovel, "vistaLivre">): boolean {
  return listing.vistaLivre === true;
}

function isUniform<T>(values: T[]): boolean {
  if (values.length <= 1) return true;
  const first = values[0];
  return values.every((value) => value === first);
}

export function computeListingToolbarVisibility(
  listings: Pick<Imovel, "tipoImovel" | "piscina" | "vistaLivre">[]
): ListingToolbarVisibility {
  if (listings.length === 0) {
    return {
      showTipoImovel: true,
      showPiscina: true,
      showVistaLivre: true
    };
  }

  const tipos = listings.map((listing) => normalizeTipoImovel(listing.tipoImovel));
  const piscinas = listings.map((listing) => hasPiscina(listing));
  const vistasLivres = listings.map((listing) => hasVistaLivre(listing));

  return {
    showTipoImovel: !isUniform(tipos),
    showPiscina: !isUniform(piscinas),
    showVistaLivre: !isUniform(vistasLivres)
  };
}
