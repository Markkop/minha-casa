import { tick } from "svelte";
import type { Property } from "$lib/listings/types";
import {
  applyFeaturePatch,
  defaultFeatureCatalog,
  getFeatureValue,
  toggleFeatureValue,
  type ListingFeatureOption
} from "$lib/listings/listing-features";
import {
  clampListingCount,
  type ListingCountField
} from "$lib/listings/listing-count-field";
import { buildListingMarkdown } from "$lib/listings/listing-markdown";
import {
  isStrikethroughStage,
  type ListingStage,
  scrollListingIntoViewIfNeeded,
  type PropertyTypeValue
} from "$lib/components/listings/listings-table-shared";

export interface CreateListingRowInteractionsOptions {
  getImovel: () => Property;
  getFeatureCatalog?: () => ListingFeatureOption[];
  updateListing: (listingId: string, updates: Partial<Property>) => Promise<Property>;
  removeListing: (listingId: string) => Promise<void>;
}

export function createListingRowInteractions({
  getImovel,
  getFeatureCatalog = () => defaultFeatureCatalog(),
  updateListing: apiUpdateListing,
  removeListing: apiRemoveListing
}: CreateListingRowInteractionsOptions) {
  let propertyTypePopoverOpen = $state(false);
  let copyToCollectionPopoverOpen = $state(false);
  let copiedMarkdown = $state(false);
  const countAdjustmentsInFlight = new Set<string>();

  async function handleToggleStar() {
    const property = getImovel();
    const wasStarred = property.starred;
    try {
      const updated = await apiUpdateListing(property.id, { starred: !property.starred });
      if (!wasStarred && updated.starred) {
        await tick();
        scrollListingIntoViewIfNeeded(property.id);
      }
    } catch (error) {
      console.error("Failed to toggle star:", error);
    }
  }

  async function handleChangeListingStage(nextStage: ListingStage) {
    const property = getImovel();
    try {
      await apiUpdateListing(property.id, {
        stage: nextStage,
        strikethrough: isStrikethroughStage(nextStage),
        visited: nextStage === "visited"
      });
    } catch (error) {
      console.error("Failed to change listing stage:", error);
    }
  }

  async function handleToggleFeature(key: string) {
    const property = getImovel();
    const catalog = getFeatureCatalog();
    const current = getFeatureValue(property, key, catalog);
    const next = toggleFeatureValue(current);
    const patched = applyFeaturePatch(property, key, next, catalog);

    try {
      await apiUpdateListing(property.id, patched);
    } catch (error) {
      console.error(`Failed to toggle feature ${key}:`, error);
    }
  }

  async function handleTogglePiscina() {
    await handleToggleFeature("pool");
  }

  async function handleTogglePiscinaTermica() {
    await handleToggleFeature("heatedPool");
  }

  async function handleTogglePorteiro24h() {
    await handleToggleFeature("doorman24h");
  }

  async function handleToggleAcademia() {
    await handleToggleFeature("gym");
  }

  async function handleToggleVistaLivre() {
    await handleToggleFeature("unobstructedView");
  }

  async function handleSetCount(field: ListingCountField, nextValue: number) {
    const property = getImovel();
    const current = (property[field] as number | null) ?? 0;
    const clamped = clampListingCount(field, nextValue);
    if (clamped === current) return;

    const flightKey = `${property.id}:${field}`;
    if (countAdjustmentsInFlight.has(flightKey)) return;
    countAdjustmentsInFlight.add(flightKey);

    try {
      await apiUpdateListing(property.id, { [field]: clamped });
    } catch (error) {
      console.error(`Failed to set ${field}:`, error);
      throw error;
    } finally {
      countAdjustmentsInFlight.delete(flightKey);
    }
  }

  async function handleSetPropertyType(propertyType: PropertyTypeValue) {
    const property = getImovel();
    try {
      await apiUpdateListing(property.id, { propertyType });
      propertyTypePopoverOpen = false;
    } catch (error) {
      console.error("Failed to set property type:", error);
    }
  }

  async function handleCopyListingMarkdown() {
    const property = getImovel();
    try {
      await navigator.clipboard.writeText(buildListingMarkdown(property));
      copiedMarkdown = true;
      setTimeout(() => {
        copiedMarkdown = false;
      }, 2000);
    } catch (error) {
      console.error("Failed to copy listing markdown:", error);
    }
  }

  async function handleDelete() {
    const property = getImovel();
    try {
      await apiRemoveListing(property.id);
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
    get propertyTypePopoverOpen() {
      return propertyTypePopoverOpen;
    },
    set propertyTypePopoverOpen(value: boolean) {
      propertyTypePopoverOpen = value;
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
    handleChangeListingStage,
    handleToggleFeature,
    handleTogglePiscina,
    handleTogglePiscinaTermica,
    handleTogglePorteiro24h,
    handleToggleAcademia,
    handleToggleVistaLivre,
    handleSetCount,
    handleSetPropertyType,
    handleCopyListingMarkdown,
    handleDelete,
    handleCopyToCollection
  };
}

export type ListingRowInteractions = ReturnType<typeof createListingRowInteractions>;
