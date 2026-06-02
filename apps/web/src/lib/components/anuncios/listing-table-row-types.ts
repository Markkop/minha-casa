import type { Collection, Imovel } from "$lib/anuncios/types";
import type { ListingToolbarVisibility } from "$lib/anuncios/listing-toolbar-visibility";
import type { ListingsPropertyDisplayPrefs, MetricVariant } from "$lib/anuncios/listings-display-prefs";
import type { FieldChange } from "$lib/components/anuncios/QuickReparseModal.svelte";
import type { ListingRowInteractions } from "$lib/components/anuncios/listing-row-interactions.svelte";
import type { ImageColumnView, ListingsTableColumn } from "$lib/components/anuncios/listings-table-shared";

export interface ListingTableRowProps {
  imovel: Imovel;
  visibleColumns: Record<ListingsTableColumn, boolean>;
  imageColumnView: ImageColumnView;
  enabledMetricVariants: Set<MetricVariant>;
  propertyDisplay: ListingsPropertyDisplayPrefs;
  toolbarVisibility: ListingToolbarVisibility;
  activeMetricVariant: MetricVariant | null;
  uniqueContacts: { name: string | null; number: string }[];
  hasOtherCollections: boolean;
  collections: Collection[];
  activeCollectionId: string | null;
  updateListing: (listingId: string, updates: Partial<Imovel>) => Promise<Imovel>;
  removeListing: (listingId: string) => Promise<void>;
  openImageModal: (listing: Imovel) => void;
  openEditListing: (listing: Imovel) => void;
  onQuickReparseRequest: (
    listing: Imovel,
    input: string
  ) => Promise<
    | { outcome: "no-changes" }
    | { outcome: "changes"; changes: FieldChange[] }
    | { outcome: "error"; message: string }
  >;
  onQuickReparseDetected: (listing: Imovel, changes: FieldChange[]) => void;
  getRowInteractions: (listing: Imovel) => ListingRowInteractions;
  displayTitle: string;
}
