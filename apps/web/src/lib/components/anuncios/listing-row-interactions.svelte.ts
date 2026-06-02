import type { Imovel } from "$lib/anuncios/types";
import { buildListingMarkdown } from "$lib/anuncios/listing-markdown";
import type { FieldChange } from "$lib/components/anuncios/QuickReparseModal.svelte";
import {
  isStrikethroughStatus,
  type ListingStatus,
  type TipoImovelValue
} from "$lib/components/anuncios/listings-table-shared";

export type QuickReparseResult =
  | { outcome: "no-changes" }
  | { outcome: "changes"; changes: FieldChange[] }
  | { outcome: "error"; message: string };

export interface CreateListingRowInteractionsOptions {
  getImovel: () => Imovel;
  updateListing: (listingId: string, updates: Partial<Imovel>) => Promise<Imovel>;
  removeListing: (listingId: string) => Promise<void>;
  onQuickReparseRequest: (listing: Imovel, input: string) => Promise<QuickReparseResult>;
  onQuickReparseDetected: (listing: Imovel, changes: FieldChange[]) => void;
}

export function createListingRowInteractions({
  getImovel,
  updateListing: apiUpdateListing,
  removeListing: apiRemoveListing,
  onQuickReparseRequest,
  onQuickReparseDetected
}: CreateListingRowInteractionsOptions) {
  let tipoImovelPopoverOpen = $state(false);
  let contactPopoverOpen = $state(false);
  let contactNameInput = $state("");
  let contactNumberInput = $state("");
  let contactSelectorOpen = $state(false);
  let quickReparsePopoverOpen = $state(false);
  let quickReparseInput = $state("");
  let quickReparseLoading = $state(false);
  let quickReparseError = $state<string | null>(null);
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

  function openContactPopover() {
    const imovel = getImovel();
    contactNameInput = imovel.contactName || "";
    contactNumberInput = imovel.contactNumber || "";
    contactPopoverOpen = true;
    contactSelectorOpen = false;
  }

  function handleSelectExistingContact(contact: { name: string | null; number: string }) {
    contactNameInput = contact.name || "";
    contactNumberInput = contact.number;
    contactSelectorOpen = false;
  }

  async function handleSaveContact() {
    const imovel = getImovel();
    try {
      await apiUpdateListing(imovel.id, {
        contactName: contactNameInput.trim() || null,
        contactNumber: contactNumberInput.trim() || null
      });
      contactPopoverOpen = false;
      contactNameInput = "";
      contactNumberInput = "";
    } catch (error) {
      console.error("Failed to save contact:", error);
    }
  }

  function openQuickReparsePopover() {
    quickReparseInput = "";
    quickReparseError = null;
    quickReparsePopoverOpen = true;
  }

  async function runQuickReparse() {
    if (!quickReparseInput.trim()) return;
    const imovel = getImovel();

    quickReparseLoading = true;
    quickReparseError = null;

    try {
      const result = await onQuickReparseRequest(imovel, quickReparseInput);

      if (result.outcome === "no-changes") {
        quickReparsePopoverOpen = false;
        quickReparseInput = "";
        return;
      }

      if (result.outcome === "error") {
        quickReparseError = result.message;
        return;
      }

      onQuickReparseDetected(imovel, result.changes);
      quickReparsePopoverOpen = false;
      quickReparseInput = "";
    } finally {
      quickReparseLoading = false;
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
    get contactPopoverOpen() {
      return contactPopoverOpen;
    },
    set contactPopoverOpen(value: boolean) {
      contactPopoverOpen = value;
    },
    get contactNameInput() {
      return contactNameInput;
    },
    set contactNameInput(value: string) {
      contactNameInput = value;
    },
    get contactNumberInput() {
      return contactNumberInput;
    },
    set contactNumberInput(value: string) {
      contactNumberInput = value;
    },
    get contactSelectorOpen() {
      return contactSelectorOpen;
    },
    set contactSelectorOpen(value: boolean) {
      contactSelectorOpen = value;
    },
    get quickReparsePopoverOpen() {
      return quickReparsePopoverOpen;
    },
    set quickReparsePopoverOpen(value: boolean) {
      quickReparsePopoverOpen = value;
    },
    get quickReparseInput() {
      return quickReparseInput;
    },
    set quickReparseInput(value: string) {
      quickReparseInput = value;
    },
    get quickReparseLoading() {
      return quickReparseLoading;
    },
    get quickReparseError() {
      return quickReparseError;
    },
    set quickReparseError(value: string | null) {
      quickReparseError = value;
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
    openContactPopover,
    handleSelectExistingContact,
    handleSaveContact,
    openQuickReparsePopover,
    runQuickReparse,
    handleCopyListingMarkdown,
    handleDelete,
    handleCopyToCollection
  };
}

export type ListingRowInteractions = ReturnType<typeof createListingRowInteractions>;
