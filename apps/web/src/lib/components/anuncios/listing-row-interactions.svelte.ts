import type { Imovel } from "$lib/anuncios/types";
import {
  applyPreferencePatch,
  defaultPreferenceCatalog,
  getPreferenceValue,
  togglePreferenceValue,
  type ListingPreferenceOption
} from "$lib/anuncios/listing-preferences";
import {
  clampListingCount,
  type ListingCountField
} from "$lib/anuncios/listing-count-field";
import { buildListingMarkdown } from "$lib/anuncios/listing-markdown";
import {
  isStrikethroughEtapa,
  type ListingEtapa,
  type TipoImovelValue
} from "$lib/components/anuncios/listings-table-shared";

export interface CreateListingRowInteractionsOptions {
  getImovel: () => Imovel;
  getPreferenceCatalog?: () => ListingPreferenceOption[];
  updateListing: (listingId: string, updates: Partial<Imovel>) => Promise<Imovel>;
  removeListing: (listingId: string) => Promise<void>;
}

export function createListingRowInteractions({
  getImovel,
  getPreferenceCatalog = () => defaultPreferenceCatalog(),
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

  async function handleChangeListingEtapa(nextEtapa: ListingEtapa) {
    const imovel = getImovel();
    try {
      await apiUpdateListing(imovel.id, {
        listingEtapa: nextEtapa,
        strikethrough: isStrikethroughEtapa(nextEtapa),
        visited: nextEtapa === "visitado"
      });
    } catch (error) {
      console.error("Failed to change listing etapa:", error);
    }
  }

  async function handleTogglePreference(key: string) {
    const imovel = getImovel();
    const catalog = getPreferenceCatalog();
    const current = getPreferenceValue(imovel, key, catalog);
    const next = togglePreferenceValue(current);
    const patched = applyPreferencePatch(imovel, key, next, catalog);

    try {
      await apiUpdateListing(imovel.id, patched);
    } catch (error) {
      console.error(`Failed to toggle preference ${key}:`, error);
    }
  }

  async function handleTogglePiscina() {
    await handleTogglePreference("piscina");
  }

  async function handleTogglePiscinaTermica() {
    await handleTogglePreference("piscina_termica");
  }

  async function handleTogglePorteiro24h() {
    await handleTogglePreference("portaria");
  }

  async function handleToggleAcademia() {
    await handleTogglePreference("academia");
  }

  async function handleToggleVistaLivre() {
    await handleTogglePreference("vista_livre");
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
    handleChangeListingEtapa,
    handleTogglePreference,
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
