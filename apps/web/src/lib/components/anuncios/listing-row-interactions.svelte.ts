import type { Imovel } from "$lib/anuncios/types";
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

  async function handleCycleAndar() {
    const imovel = getImovel();
    try {
      const current = imovel.andar ?? 0;
      const nextValue = current >= 10 ? 0 : current + 1;
      await apiUpdateListing(imovel.id, { andar: nextValue });
    } catch (error) {
      console.error("Failed to cycle andar:", error);
    }
  }

  async function handleCycleGaragem() {
    const imovel = getImovel();
    try {
      const current = imovel.garagem ?? 0;
      const nextValue = current >= 4 ? 0 : current + 1;
      await apiUpdateListing(imovel.id, { garagem: nextValue });
    } catch (error) {
      console.error("Failed to cycle garagem:", error);
    }
  }

  async function handleCycleQuartos() {
    const imovel = getImovel();
    try {
      const current = imovel.quartos ?? 0;
      const nextValue = current >= 6 ? 0 : current + 1;
      await apiUpdateListing(imovel.id, { quartos: nextValue });
    } catch (error) {
      console.error("Failed to cycle quartos:", error);
    }
  }

  async function handleCycleBanheiros() {
    const imovel = getImovel();
    try {
      const current = imovel.banheiros ?? 0;
      const nextValue = current >= 6 ? 0 : current + 1;
      await apiUpdateListing(imovel.id, { banheiros: nextValue });
    } catch (error) {
      console.error("Failed to cycle banheiros:", error);
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
    handleCycleAndar,
    handleCycleGaragem,
    handleCycleQuartos,
    handleCycleBanheiros,
    handleSetTipoImovel,
    handleCopyListingMarkdown,
    handleDelete,
    handleCopyToCollection
  };
}

export type ListingRowInteractions = ReturnType<typeof createListingRowInteractions>;
