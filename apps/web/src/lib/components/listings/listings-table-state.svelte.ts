import type { Property } from "$lib/listings/types";
import {
  DEFAULT_PROPERTY_DISPLAY,
  getEnabledMetricVariants,
  getInitialPropertyDisplay,
  PROPERTY_DISPLAY_STORAGE_KEY,
  shouldShowPropertyTypeFilters,
  type ListingsPropertyDisplayPrefs,
  type MetricVariant
} from "$lib/listings/listings-display-prefs";
import {
  COLUMN_STORAGE_KEY,
  getInitialImageColumnView,
  getInitialVisibleColumns,
  IMAGE_COLUMN_VIEW_KEY,
  type ImageColumnView,
  type ListingsTableColumn
} from "$lib/components/listings/listings-table-shared";
import { shouldUseCasaAreaLabelsForCollection } from "$lib/listings/area-metric-labels";
import {
  type ListingsSortKey,
  type ListingsSortState
} from "$lib/components/listings/listings-sort-shared";

export type PropertyTypeFilter = "all" | "house" | "apartment";

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

function getSortValue(property: Property, key: ListingsSortKey): number | string {
  switch (key) {
    case "title":
      return property.title.toLowerCase();
    case "totalAreaM2":
      return property.totalAreaM2 ?? 0;
    case "privateAreaM2":
      return property.privateAreaM2 ?? 0;
    case "bedrooms":
      return property.bedrooms ?? 0;
    case "price":
      return property.price ?? 0;
    case "pricePerM2":
      return property.price && property.totalAreaM2 ? property.price / property.totalAreaM2 : 0;
    case "precoM2Privado":
      return property.price && property.privateAreaM2 ? property.price / property.privateAreaM2 : 0;
    case "addedAt":
      return property.addedAt || "2025-12-31";
    default:
      return 0;
  }
}

export function createListingsTableState(getListings: () => Property[]) {
  let searchQuery = $state("");
  let sort = $state<ListingsSortState>({ key: "price", direction: "desc" });
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
  const casaCount = $derived(listings.filter((listing) => listing.propertyType === "house").length);
  const aptoCount = $derived(listings.filter((listing) => listing.propertyType === "apartment").length);
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
    if (!showStrikethrough) filtered = filtered.filter((property) => !property.strikethrough);
    if (query) {
      filtered = filtered.filter(
        (property) =>
          property.title.toLowerCase().includes(query) || property.address.toLowerCase().includes(query)
      );
    }
    if (propertyTypeFilter !== "all") {
      filtered = filtered.filter((property) => property.propertyType === propertyTypeFilter);
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
    sort.key === "totalAreaM2" || sort.key === "pricePerM2"
      ? "total"
      : sort.key === "privateAreaM2" || sort.key === "precoM2Privado"
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
