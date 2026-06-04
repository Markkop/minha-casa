import type { Imovel } from "$lib/anuncios/types";

type TipoImovelValue = "casa" | "apartamento" | null;

const INACTIVE_LISTING_STATUSES = new Set(["descartado", "vendido"]);

export type ListingToolbarListingSlice = Pick<
  Imovel,
  "tipoImovel" | "piscina" | "vistaLivre" | "strikethrough" | "listingStatus"
>;

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

/** Vendido/descartado rows keep the full preference toolbar for editing. */
export function isListingInactiveForToolbar(
  listing: Pick<Imovel, "strikethrough" | "listingStatus">
): boolean {
  if (listing.strikethrough) return true;
  const status = listing.listingStatus;
  return status != null && INACTIVE_LISTING_STATUSES.has(status);
}

export function resolveListingToolbarVisibility(
  listing: Pick<Imovel, "strikethrough" | "listingStatus">,
  collectionVisibility: ListingToolbarVisibility
): ListingToolbarVisibility {
  if (isListingInactiveForToolbar(listing)) {
    return DEFAULT_LISTING_TOOLBAR_VISIBILITY;
  }
  return collectionVisibility;
}

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
  listings: ListingToolbarListingSlice[]
): ListingToolbarVisibility {
  if (listings.length === 0) {
    return DEFAULT_LISTING_TOOLBAR_VISIBILITY;
  }

  const activeListings = listings.filter((listing) => !isListingInactiveForToolbar(listing));
  const source = activeListings.length > 0 ? activeListings : listings;

  const tipos = source.map((listing) => normalizeTipoImovel(listing.tipoImovel));
  const piscinas = source.map((listing) => hasPiscina(listing));
  const vistasLivres = source.map((listing) => hasVistaLivre(listing));

  return {
    showTipoImovel: !isUniform(tipos),
    showPiscina: !isUniform(piscinas),
    showVistaLivre: !isUniform(vistasLivres)
  };
}
