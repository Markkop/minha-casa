import type { Imovel } from "$lib/anuncios/types";
import {
  clampListingCount,
  type ListingCountField
} from "$lib/anuncios/listing-count-field";
import { buildListingMarkdown } from "$lib/anuncios/listing-markdown";
import {
  isStrikethroughStatus,
  type ListingStatus,
  type TipoImovelValue
} from "$lib/components/anuncios/listings-table-shared";

export interface CreateListingRowInteractionsOptions {
  getImovel: () => Imovel;
  updateListing: (listingId: string, updates: Partial<Imovel>) => Promise<Imovel>;
  removeListing: (listingId: string) => Promise<void>;
}

export function createListingRowInteractions({
  getImovel,
  updateListing: apiUpdateListing,
  removeListing: apiRemoveListing
}: CreateListingRowInteractionsOptions) {
  let tipoImovelPopoverOpen = $state(false);
  let copyToCollectionPopoverOpen = $state(false);
  let copiedMarkdown = $state(false);
  const countAdjustmentsInFlight = new Set<string>();

  async function handleToggleStar() {
    const imovel = getImovel();
    try {
      await apiUpdateListing(imovel.id, { starred: !imovel.starred });
    } catch (error) {
      console.error("Failed to toggle star:", error);
    }
  }

  async function handleChangeListingStatus(nextStatus: ListingStatus) {
    const imovel = getImovel();
    try {
      await apiUpdateListing(imovel.id, {
        listingStatus: nextStatus,
        strikethrough: isStrikethroughStatus(nextStatus),
        visited: nextStatus === "visitado"
      });
    } catch (error) {
      console.error("Failed to change listing status:", error);
    }
  }

  async function handleTogglePiscina() {
    const imovel = getImovel();
    try {
      await apiUpdateListing(imovel.id, { piscina: imovel.piscina === true ? false : true });
    } catch (error) {
      console.error("Failed to toggle piscina:", error);
    }
  }

  async function handleTogglePiscinaTermica() {
    const imovel = getImovel();
    try {
      await apiUpdateListing(imovel.id, {
        piscinaTermica: imovel.piscinaTermica === true ? false : true
      });
    } catch (error) {
      console.error("Failed to toggle piscina térmica:", error);
    }
  }

  async function handleTogglePorteiro24h() {
    const imovel = getImovel();
    try {
      await apiUpdateListing(imovel.id, {
        porteiro24h: imovel.porteiro24h === true ? false : true
      });
    } catch (error) {
      console.error("Failed to toggle porteiro 24h:", error);
    }
  }

  async function handleToggleAcademia() {
    const imovel = getImovel();
    try {
      await apiUpdateListing(imovel.id, { academia: imovel.academia === true ? false : true });
    } catch (error) {
      console.error("Failed to toggle academia:", error);
    }
  }

  async function handleToggleVistaLivre() {
    const imovel = getImovel();
    try {
      await apiUpdateListing(imovel.id, { vistaLivre: imovel.vistaLivre === true ? false : true });
    } catch (error) {
      console.error("Failed to toggle vista livre:", error);
    }
  }

  async function handleSetCount(field: ListingCountField, nextValue: number) {
    const imovel = getImovel();
    const current = (imovel[field] as number | null) ?? 0;
    const clamped = clampListingCount(field, nextValue);
    if (clamped === current) return;

    const flightKey = `${imovel.id}:${field}`;
    if (countAdjustmentsInFlight.has(flightKey)) return;
    countAdjustmentsInFlight.add(flightKey);

    try {
      await apiUpdateListing(imovel.id, { [field]: clamped });
    } catch (error) {
      console.error(`Failed to set ${field}:`, error);
      throw error;
    } finally {
      countAdjustmentsInFlight.delete(flightKey);
    }
  }

  async function handleSetTipoImovel(tipo: TipoImovelValue) {
    const imovel = getImovel();
    try {
      await apiUpdateListing(imovel.id, { tipoImovel: tipo });
      tipoImovelPopoverOpen = false;
    } catch (error) {
      console.error("Failed to set tipo imóvel:", error);
    }
  }

  async function handleCopyListingMarkdown() {
    const imovel = getImovel();
    try {
      await navigator.clipboard.writeText(buildListingMarkdown(imovel));
      copiedMarkdown = true;
      setTimeout(() => {
        copiedMarkdown = false;
      }, 2000);
    } catch (error) {
      console.error("Failed to copy listing markdown:", error);
    }
  }

  async function handleDelete() {
    const imovel = getImovel();
    try {
      await apiRemoveListing(imovel.id);
    } catch (error) {
      console.error("Failed to delete listing:", error);
    }
  }

  async function handleCopyToCollection(targetCollectionId: string) {
    void targetCollectionId;
    console.warn("Copy to collection feature is not yet implemented with server-side storage");
    copyToCollectionPopoverOpen = false;
  }

  return {
    get tipoImovelPopoverOpen() {
      return tipoImovelPopoverOpen;
    },
    set tipoImovelPopoverOpen(value: boolean) {
      tipoImovelPopoverOpen = value;
    },
    get copyToCollectionPopoverOpen() {
      return copyToCollectionPopoverOpen;
    },
    set copyToCollectionPopoverOpen(value: boolean) {
      copyToCollectionPopoverOpen = value;
    },
    get copiedMarkdown() {
      return copiedMarkdown;
    },
    handleToggleStar,
    handleChangeListingStatus,
    handleTogglePiscina,
    handleTogglePiscinaTermica,
    handleTogglePorteiro24h,
    handleToggleAcademia,
    handleToggleVistaLivre,
    handleSetCount,
    handleSetTipoImovel,
    handleCopyListingMarkdown,
    handleDelete,
    handleCopyToCollection
  };
}

export type ListingRowInteractions = ReturnType<typeof createListingRowInteractions>;
