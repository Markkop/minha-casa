import { toCollection, type Collection } from "$lib/listings/types";
import { workspaceApi, type WorkspaceProfile } from "$lib/workspace/client";

export type ScenarioCollectionDestination = {
  collection: Collection;
  workspaceId: string;
  organizationId: string | null;
  profileLabel: string;
  label: string;
};

function destination(
  collection: Collection,
  workspaceId: string,
  organizationId: string | null,
  profileLabel: string
): ScenarioCollectionDestination {
  return {
    collection,
    workspaceId,
    organizationId,
    profileLabel,
    label: `${collection.name} - ${profileLabel}`
  };
}

async function loadProfileCollections(
  profile: WorkspaceProfile
): Promise<ScenarioCollectionDestination[]> {
  const organizationId = profile.organizationId ?? null;
  const { collections } = await workspaceApi.fetchCollections({
    workspaceId: profile.workspaceId,
    organizationId
  });
  return collections
    .map(toCollection)
    .map((collection) =>
      destination(collection, profile.workspaceId, organizationId, profile.label)
    );
}

export async function loadScenarioCollectionDestinations(): Promise<
  ScenarioCollectionDestination[]
> {
  const { profiles } = await workspaceApi.fetchProfiles();
  const writableProfiles = profiles.filter(
    (profile) =>
      profile.status === "active" && profile.type !== "external" && profile.access !== "viewer"
  );
  const destinations = (await Promise.all(writableProfiles.map(loadProfileCollections))).flat();
  const uniqueDestinations = new Map<string, ScenarioCollectionDestination>();

  for (const item of destinations) {
    if (!uniqueDestinations.has(item.collection.id)) {
      uniqueDestinations.set(item.collection.id, item);
    }
  }

  return [...uniqueDestinations.values()];
}

export function findScenarioCollectionDestination(
  destinations: ScenarioCollectionDestination[],
  collectionId: string | null
): ScenarioCollectionDestination | null {
  if (!collectionId) return null;
  return destinations.find((destination) => destination.collection.id === collectionId) ?? null;
}
