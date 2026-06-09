import type { Imovel } from "$lib/anuncios/types";
import {
  DEFAULT_PROPERTY_DISPLAY,
  getEnabledMetricVariants,
  getInitialPropertyDisplay,
  PROPERTY_DISPLAY_STORAGE_KEY,
  shouldShowPropertyTypeFilters,
  type ListingsPropertyDisplayPrefs,
  type MetricVariant
} from "$lib/anuncios/listings-display-prefs";
import {
  COLUMN_STORAGE_KEY,
  getInitialImageColumnView,
  getInitialVisibleColumns,
  IMAGE_COLUMN_VIEW_KEY,
  type ImageColumnView,
  type ListingsTableColumn
} from "$lib/components/anuncios/listings-table-shared";
import { shouldUseCasaAreaLabelsForCollection } from "$lib/anuncios/area-metric-labels";
import {
  type ListingsSortKey,
  type ListingsSortState
} from "$lib/components/anuncios/listings-sort-shared";

export type PropertyTypeFilter = "all" | "casa" | "apartamento";

function persistVisibleColumns(columns: Record<ListingsTableColumn, boolean>) {
  try {
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(columns));
  } catch {
    // ignore storage errors
  }
}

function persistPropertyDisplay(prefs: ListingsPropertyDisplayPrefs) {
  try {
    localStorage.setItem(PROPERTY_DISPLAY_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage errors
  }
}

function persistImageColumnView(view: ImageColumnView) {
  try {
    localStorage.setItem(IMAGE_COLUMN_VIEW_KEY, view);
  } catch {
    // ignore storage errors
  }
}

function getSortValue(imovel: Imovel, key: ListingsSortKey): number | string {
  switch (key) {
    case "titulo":
      return imovel.titulo.toLowerCase();
    case "m2Totais":
      return imovel.m2Totais ?? 0;
    case "m2Privado":
      return imovel.m2Privado ?? 0;
    case "quartos":
      return imovel.quartos ?? 0;
    case "preco":
      return imovel.preco ?? 0;
    case "precoM2":
      return imovel.preco && imovel.m2Totais ? imovel.preco / imovel.m2Totais : 0;
    case "precoM2Privado":
      return imovel.preco && imovel.m2Privado ? imovel.preco / imovel.m2Privado : 0;
    case "addedAt":
      return imovel.addedAt || "2025-12-31";
    default:
      return 0;
  }
}

export function createListingsTableState(getListings: () => Imovel[]) {
  let searchQuery = $state("");
  let sort = $state<ListingsSortState>({ key: "preco", direction: "desc" });
  let propertyTypeFilter = $state<PropertyTypeFilter>("all");
  let showStrikethrough = $state(true);
  let visibleColumns = $state(getInitialVisibleColumns());
  let propertyDisplay = $state<ListingsPropertyDisplayPrefs>({ ...DEFAULT_PROPERTY_DISPLAY });
  let imageColumnView = $state<ImageColumnView>("image");

  function initFromLocalStorage() {
    propertyDisplay = getInitialPropertyDisplay();
    imageColumnView = getInitialImageColumnView();
  }

  function setVisibleColumns(next: Record<ListingsTableColumn, boolean>) {
    visibleColumns = next;
    persistVisibleColumns(next);
  }

  function setPropertyDisplay(next: ListingsPropertyDisplayPrefs) {
    propertyDisplay = next;
    persistPropertyDisplay(next);
  }

  function setImageColumnView(next: ImageColumnView) {
    imageColumnView = next;
    persistImageColumnView(next);
  }

  function handleSort(key: ListingsSortKey) {
    sort = {
      key,
      direction: sort.key === key && sort.direction === "desc" ? "asc" : "desc"
    };
  }

  const listings = $derived(getListings());
  const enabledMetricVariants = $derived(getEnabledMetricVariants(propertyDisplay));
  const showTypeFilters = $derived(shouldShowPropertyTypeFilters(listings));
  const hasDiscardedListings = $derived(listings.some((listing) => listing.strikethrough));
  const casaCount = $derived(listings.filter((listing) => listing.tipoImovel === "casa").length);
  const aptoCount = $derived(listings.filter((listing) => listing.tipoImovel === "apartamento").length);
  const useCasaAreaLabels = $derived(
    shouldUseCasaAreaLabelsForCollection({
      propertyTypeFilter,
      casaCount,
      aptoCount
    })
  );

  const filteredAndSortedListings = $derived.by(() => {
    const query = searchQuery.toLowerCase().trim();
    let filtered = listings;
    if (!showStrikethrough) filtered = filtered.filter((imovel) => !imovel.strikethrough);
    if (query) {
      filtered = filtered.filter(
        (imovel) =>
          imovel.titulo.toLowerCase().includes(query) || imovel.endereco.toLowerCase().includes(query)
      );
    }
    if (propertyTypeFilter !== "all") {
      filtered = filtered.filter((imovel) => imovel.tipoImovel === propertyTypeFilter);
    }
    return [...filtered].sort((a, b) => {
      const aStarred = a.starred ? 1 : 0;
      const bStarred = b.starred ? 1 : 0;
      if (aStarred !== bStarred) return bStarred - aStarred;

      const aVal = getSortValue(a, sort.key);
      const bVal = getSortValue(b, sort.key);
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sort.direction === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sort.direction === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  });

  const activeMetricVariant = $derived<MetricVariant | null>(
    sort.key === "m2Totais" || sort.key === "precoM2"
      ? "total"
      : sort.key === "m2Privado" || sort.key === "precoM2Privado"
        ? "privado"
        : null
  );

  return {
    get searchQuery() {
      return searchQuery;
    },
    set searchQuery(value: string) {
      searchQuery = value;
    },
    get sort() {
      return sort;
    },
    get propertyTypeFilter() {
      return propertyTypeFilter;
    },
    set propertyTypeFilter(value: PropertyTypeFilter) {
      propertyTypeFilter = value;
    },
    get showStrikethrough() {
      return showStrikethrough;
    },
    set showStrikethrough(value: boolean) {
      showStrikethrough = value;
    },
    get visibleColumns() {
      return visibleColumns;
    },
    get propertyDisplay() {
      return propertyDisplay;
    },
    get imageColumnView() {
      return imageColumnView;
    },
    initFromLocalStorage,
    setVisibleColumns,
    setPropertyDisplay,
    setImageColumnView,
    handleSort,
    get enabledMetricVariants() {
      return enabledMetricVariants;
    },
    get showTypeFilters() {
      return showTypeFilters;
    },
    get hasDiscardedListings() {
      return hasDiscardedListings;
    },
    get casaCount() {
      return casaCount;
    },
    get aptoCount() {
      return aptoCount;
    },
    get useCasaAreaLabels() {
      return useCasaAreaLabels;
    },
    get filteredAndSortedListings() {
      return filteredAndSortedListings;
    },
    get activeMetricVariant() {
      return activeMetricVariant;
    }
  };
}
