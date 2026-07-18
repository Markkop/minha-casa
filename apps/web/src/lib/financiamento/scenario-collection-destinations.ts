import { toCollection, type Collection } from "$lib/listings/types";
import { workspaceApi, type Organization } from "$lib/workspace/client";

export type ScenarioCollectionDestination = {
  collection: Collection;
  organizationId: string | null;
  profileLabel: string;
  label: string;
};

function destination(
  collection: Collection,
  organizationId: string | null,
  profileLabel: string
): ScenarioCollectionDestination {
  return {
    collection,
    organizationId,
    profileLabel,
    label: `${collection.name} - ${profileLabel}`
  };
}

async function loadProfileCollections(
  organizationId: string | null,
  profileLabel: string
): Promise<ScenarioCollectionDestination[]> {
  const { collections } = await workspaceApi.fetchCollections({ organizationId });
  return collections
    .map(toCollection)
    .map((collection) => destination(collection, organizationId, profileLabel));
}

export async function loadScenarioCollectionDestinations(): Promise<
  ScenarioCollectionDestination[]
> {
  const [{ organizations }, personalCollections] = await Promise.all([
    workspaceApi.fetchOrganizations(),
    loadProfileCollections(null, "Pessoal")
  ]);

  const organizationCollections = await Promise.all(
    organizations.map((organization: Organization) =>
      loadProfileCollections(organization.id, organization.name)
    )
  );

  return [...personalCollections, ...organizationCollections.flat()];
}

export function findScenarioCollectionDestination(
  destinations: ScenarioCollectionDestination[],
  collectionId: string | null
): ScenarioCollectionDestination | null {
  if (!collectionId) return null;
  return destinations.find((destination) => destination.collection.id === collectionId) ?? null;
}
