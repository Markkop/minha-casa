import type { Property } from "$lib/listings/types";
import type {
  FloorPlan,
  FloorPlanAreaLink,
  ListingEnvironment,
  ListingImage,
  PlantaDocument
} from "$lib/components/planta/types";
import { parsePlantaDocument } from "$lib/components/planta/state";

export function hydrateFloorPlanDocument(floorPlan: FloorPlan): PlantaDocument {
  const parsed = applyAreaLinks(parsePlantaDocument(floorPlan.document), floorPlan.areaLinks ?? []);
  if (!floorPlan.blueprint) return { ...parsed, blueprint: null };
  const placement = parsed.blueprint ?? {
    url: "",
    naturalWidth: 1,
    naturalHeight: 1,
    x: 0,
    y: 0,
    scale: 1,
    opacity: 0.72
  };
  return {
    ...parsed,
    blueprint: {
      ...placement,
      url: floorPlan.blueprint.url,
      naturalWidth: floorPlan.blueprint.width ?? placement.naturalWidth,
      naturalHeight: floorPlan.blueprint.height ?? placement.naturalHeight
    }
  };
}

export function persistentFloorPlanDocument(document: PlantaDocument): PlantaDocument {
  return {
    ...document,
    blueprint: document.blueprint
      ? ({
          x: document.blueprint.x,
          y: document.blueprint.y,
          scale: document.blueprint.scale,
          opacity: document.blueprint.opacity
        } as PlantaDocument["blueprint"])
      : null,
    shapes: document.shapes.map((shape) => {
      if (shape.type !== "rect") return shape;
      const { environmentId: _environmentId, customName: _customName, ...persistentShape } = shape;
      return persistentShape;
    })
  };
}

export function areaLinksFromDocument(document: PlantaDocument): FloorPlanAreaLink[] {
  return document.shapes.flatMap((shape) =>
    shape.type === "rect" && (shape.environmentId || shape.customName?.trim())
      ? [
          {
            shapeId: shape.id,
            environmentId: shape.environmentId?.trim() || null,
            customName: shape.customName?.trim() || null
          }
        ]
      : []
  );
}

export function applyAreaLinks(
  document: PlantaDocument,
  links: FloorPlanAreaLink[]
): PlantaDocument {
  const byShapeId = new Map(links.map((link) => [link.shapeId, link]));
  return {
    ...document,
    shapes: document.shapes.map((shape) => {
      if (shape.type !== "rect") return shape;
      const link = byShapeId.get(shape.id);
      return {
        ...shape,
        environmentId: link?.environmentId ?? null,
        customName: link?.customName ?? null
      };
    })
  };
}

/** Temporary boundary adapter while legacy listings still expose image arrays by index. */
export function legacyListingEnvironments(listing: Property): ListingEnvironment[] {
  const imageUrls = listing.imageUrls ?? (listing.imageUrl ? [listing.imageUrl] : []);
  return (listing.imageEnvironments ?? []).map((environment, environmentIndex) => ({
    id: environment.id,
    kind: environment.kind,
    name: environment.label,
    position: environmentIndex,
    images: environment.imageIndices.flatMap((imageIndex): ListingImage[] => {
      const url = imageUrls[imageIndex];
      if (!url) return [];
      return [
        {
          id: `${listing.id}:image:${imageIndex}`,
          url,
          position: imageIndex,
          isCover: imageIndex === (listing.coverImageIndex ?? 0)
        }
      ];
    })
  }));
}
