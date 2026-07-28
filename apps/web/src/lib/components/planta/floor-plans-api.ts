import { api } from "$lib/api/client";
import type {
  FloorPlan,
  FloorPlanAreaLink,
  ListingEnvironment,
  ListingImage,
  PlantaDocument
} from "$lib/components/planta/types";

function basePath(collectionId: string, listingId: string) {
  return `/collections/${encodeURIComponent(collectionId)}/listings/${encodeURIComponent(listingId)}`;
}

function floorPlanPath(collectionId: string, listingId: string, floorPlanId?: string) {
  const base = `${basePath(collectionId, listingId)}/floor-plans`;
  return floorPlanId ? `${base}/${encodeURIComponent(floorPlanId)}` : base;
}

export const floorPlansApi = {
  list: (collectionId: string, listingId: string) =>
    api.get<{ floorPlans: FloorPlan[] }>(floorPlanPath(collectionId, listingId)),

  get: (collectionId: string, listingId: string, floorPlanId: string) =>
    api.get<{ floorPlan: FloorPlan }>(floorPlanPath(collectionId, listingId, floorPlanId)),

  create: (collectionId: string, listingId: string, name?: string) =>
    api.post<{ floorPlan: FloorPlan }>(floorPlanPath(collectionId, listingId),
      name ? { name } : {}
    ),

  rename: (collectionId: string, listingId: string, floorPlanId: string, name: string) =>
    api.patch<{ floorPlan: FloorPlan }>(floorPlanPath(collectionId, listingId, floorPlanId), {
      name
    }),

  saveDocument: (
    collectionId: string,
    listingId: string,
    floorPlanId: string,
    document: PlantaDocument,
    areaLinks: FloorPlanAreaLink[],
    expectedRevision: number
  ) =>
    api.put<{ floorPlan: FloorPlan }>(
      `${floorPlanPath(collectionId, listingId, floorPlanId)}/document`,
      { document, areaLinks, expectedRevision }
    ),

  remove: (collectionId: string, listingId: string, floorPlanId: string) =>
    api.delete<{ success: true }>(floorPlanPath(collectionId, listingId, floorPlanId)),

  uploadBlueprint: (
    collectionId: string,
    listingId: string,
    floorPlanId: string,
    file: Blob,
    width: number,
    height: number
  ) => {
    const form = new FormData();
    form.set("file", file, "planta");
    form.set("width", String(width));
    form.set("height", String(height));
    return api.post<{ floorPlan: FloorPlan }>(
      `${floorPlanPath(collectionId, listingId, floorPlanId)}/blueprint`,
      form
    );
  },

  removeBlueprint: (collectionId: string, listingId: string, floorPlanId: string) =>
    api.delete<{ floorPlan: FloorPlan }>(
      `${floorPlanPath(collectionId, listingId, floorPlanId)}/blueprint`
    ),

  listEnvironments: (collectionId: string, listingId: string) =>
    api.get<{ images: ListingImage[]; environments: ListingEnvironment[] }>(
      `${basePath(collectionId, listingId)}/environments`
    ),

  replaceEnvironments: (
    collectionId: string,
    listingId: string,
    environments: Array<{
      id: string;
      kind: string;
      name: string;
      ordinal?: number;
      imageIds: string[];
    }>
  ) =>
    api.put<{ images: ListingImage[]; environments: ListingEnvironment[] }>(
      `${basePath(collectionId, listingId)}/environments`,
      { environments }
    )
};
