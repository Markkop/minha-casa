import type { SimulatorParams } from "$lib/components/financiamento/financiamento-parameter-types";
import type { SimulatorSettings } from "$lib/financiamento/settings";
import {
  cloneScenarioParams,
  cloneScenarioSettings,
  type SimulatorScenarioSnapshot
} from "$lib/financiamento/simulator-scenarios-storage";

export function resolveScenarioCollectionId(
  snapshotCollectionId: string | undefined,
  availableCollectionIds: string[],
  activeCollectionId: string | null
): string | null {
  if (snapshotCollectionId && availableCollectionIds.includes(snapshotCollectionId)) {
    return snapshotCollectionId;
  }
  if (activeCollectionId && availableCollectionIds.includes(activeCollectionId)) {
    return activeCollectionId;
  }
  return null;
}

export function prepareScenarioRestore(
  snapshot: SimulatorScenarioSnapshot,
  collectionId: string | null,
  availableListingIds: string[],
  currentSearch: URLSearchParams
): { params: SimulatorParams; settings: SimulatorSettings; searchParams: URLSearchParams } {
  const params = cloneScenarioParams(snapshot);
  const settings = cloneScenarioSettings(snapshot);
  if (
    !collectionId ||
    !params.linkedListingId ||
    !availableListingIds.includes(params.linkedListingId)
  ) {
    params.linkedListingId = null;
  }

  const searchParams = new URLSearchParams(currentSearch);
  if (collectionId) {
    searchParams.set("collection", collectionId);
  } else {
    searchParams.delete("collection");
  }
  if (params.linkedListingId) {
    searchParams.set("listing", params.linkedListingId);
  } else {
    searchParams.delete("listing");
  }

  return { params, settings, searchParams };
}
