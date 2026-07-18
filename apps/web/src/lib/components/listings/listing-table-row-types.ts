import type { ListingFeatureOption } from "$lib/listings/listing-features";
import type { Collection, Property } from "$lib/listings/types";
import type { ListingToolbarVisibility } from "$lib/listings/listing-toolbar-visibility";
import type { ListingsPropertyDisplayPrefs, MetricVariant } from "$lib/listings/listings-display-prefs";
import type { ListingRowInteractions } from "$lib/components/listings/listing-row-interactions.svelte";
import type { ImageColumnView, ListingsTableColumn } from "$lib/components/listings/listings-table-shared";

export interface ListingTableRowProps {
  property: Property;
  visibleColumns: Record<ListingsTableColumn, boolean>;
  imageColumnView: ImageColumnView;
  enabledMetricVariants: Set<MetricVariant>;
  propertyDisplay: ListingsPropertyDisplayPrefs;
  featureCatalog: ListingFeatureOption[];
  toolbarVisibility: ListingToolbarVisibility;
  activeMetricVariant: MetricVariant | null;
  hasOtherCollections: boolean;
  collections: Collection[];
  activeCollectionId: string | null;
  updateListing: (listingId: string, updates: Partial<Property>) => Promise<Property>;
  removeListing: (listingId: string) => Promise<void>;
  openImageModal: (listing: Property) => void;
  openEditListing: (listing: Property) => void;
  getRowInteractions: (listing: Property) => ListingRowInteractions;
  displayTitle: string;
}
