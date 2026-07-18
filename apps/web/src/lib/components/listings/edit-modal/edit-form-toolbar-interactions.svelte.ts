import type { Property } from "$lib/listings/types";
import {
  applyFeaturePatch,
  getFeatureValue,
  toggleFeatureValue,
  type ListingFeatureOption
} from "$lib/listings/listing-features";
import {
  clampListingCount,
  type ListingCountField
} from "$lib/listings/listing-count-field";
import type { PropertyTypeValue } from "$lib/components/listings/listings-table-shared";

export function createEditFormToolbarInteractions(options: {
  getDraft: () => Partial<Property>;
  patchDraft: (updates: Partial<Property>) => void;
  getFeatureCatalog: () => ListingFeatureOption[];
}) {
  let propertyTypePopoverOpen = $state(false);

  function setNumericField(field: ListingCountField, nextValue: number) {
    const draft = options.getDraft();
    const current = (draft[field] as number | null | undefined) ?? 0;
    const clamped = clampListingCount(field, nextValue);
    if (clamped === current) return;
    options.patchDraft({ [field]: clamped } as Partial<Property>);
  }

  return {
    get propertyTypePopoverOpen() {
      return propertyTypePopoverOpen;
    },
    set propertyTypePopoverOpen(value: boolean) {
      propertyTypePopoverOpen = value;
    },
    async handleSetPropertyType(propertyType: PropertyTypeValue) {
      options.patchDraft({ propertyType });
      propertyTypePopoverOpen = false;
    },
    async handleToggleFeature(key: string) {
      const catalog = options.getFeatureCatalog();
      const draft = options.getDraft();
      const current = getFeatureValue(draft, key, catalog);
      const next = toggleFeatureValue(current);
      options.patchDraft(applyFeaturePatch(draft, key, next, catalog));
    },
    async handleSetCount(field: ListingCountField, nextValue: number) {
      setNumericField(field, nextValue);
    }
  };
}

export type EditFormToolbarInteractions = ReturnType<typeof createEditFormToolbarInteractions>;
