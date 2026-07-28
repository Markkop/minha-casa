import { toCollection, type Collection } from "$lib/listings/types";
import { workspaceApi, type WorkspaceProfile } from "$lib/workspace/client";

export type CollectionDestination = {
  collection: Collection;
  workspaceId: string;
  organizationId: string | null;
  profileLabel: string;
  label: string;
};

type LoadWritableCollectionDestinationsOptions = {
  excludeCollectionId?: string | null;
};

function destination(
  collection: Collection,
  workspaceId: string,
  organizationId: string | null,
  profileLabel: string
): CollectionDestination {
  return {
    collection,
    workspaceId,
    organizationId,
    profileLabel,
    label: `${collection.name} - ${profileLabel}`
  };
}

function isWritableProfile(profile: WorkspaceProfile): boolean {
  return (
    profile.status === "active" &&
    profile.type !== "external" &&
    profile.access !== "viewer" &&
    profile.access !== "external"
  );
}

async function loadProfileCollections(profile: WorkspaceProfile): Promise<CollectionDestination[]> {
  const organizationId = profile.organizationId ?? null;
  const { collections } = await workspaceApi.fetchCollections({
    workspaceId: profile.workspaceId,
    organizationId
  });

  return collections
    .map(toCollection)
    .filter((collection) => collection.status !== "archived")
    .map((collection) =>
      destination(collection, profile.workspaceId, organizationId, profile.label)
    );
}

export async function loadWritableCollectionDestinations(
  options: LoadWritableCollectionDestinationsOptions = {}
): Promise<CollectionDestination[]> {
  const { profiles } = await workspaceApi.fetchProfiles();
  const destinations = (
    await Promise.all(profiles.filter(isWritableProfile).map(loadProfileCollections))
  ).flat();
  const uniqueDestinations = new Map<string, CollectionDestination>();

  for (const item of destinations) {
    if (
      item.collection.id !== options.excludeCollectionId &&
      !uniqueDestinations.has(item.collection.id)
    ) {
      uniqueDestinations.set(item.collection.id, item);
    }
  }

  return [...uniqueDestinations.values()];
}

export function findCollectionDestination(
  destinations: CollectionDestination[],
  collectionId: string | null
): CollectionDestination | null {
  if (!collectionId) return null;
  return destinations.find((destination) => destination.collection.id === collectionId) ?? null;
}
