export type PlantaTool = "select" | "pan" | "line" | "rect" | "square";

export type PlantaBlueprint = {
  url: string;
  naturalWidth: number;
  naturalHeight: number;
  x: number;
  y: number;
  scale: number;
  opacity: number;
};

export type PlantaViewport = {
  x: number;
  y: number;
  scale: number;
};

export type PlantaGrid = {
  visible: boolean;
  size: number;
  metersPerCell: number;
  showMeasurements: boolean;
  snapToGrid: boolean;
};

export type PlantaScaleRuler = {
  points: [number, number, number, number];
};

export type PlantaLineShape = {
  id: string;
  type: "line";
  name?: string;
  visible?: boolean;
  locked?: boolean;
  points: [number, number, number, number];
  stroke: string;
  strokeWidth: number;
};

export type PlantaRectShape = {
  id: string;
  type: "rect";
  name?: string;
  visible?: boolean;
  locked?: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  stroke: string;
  strokeWidth: number;
  fill: string;
  environmentId?: string | null;
  customName?: string | null;
};

export type PlantaShape = PlantaLineShape | PlantaRectShape;

export type PlantaDocument = {
  version: 2;
  blueprint: PlantaBlueprint | null;
  viewport: PlantaViewport;
  grid: PlantaGrid;
  scaleRuler: PlantaScaleRuler | null;
  shapes: PlantaShape[];
};

export type FloorPlanAreaLink = {
  shapeId: string;
  environmentId: string | null;
  customName: string | null;
  inheritedName?: string | null;
};

export type FloorPlanBlueprintMetadata = {
  contentType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  url: string;
};

export type FloorPlan = {
  id: string;
  workspaceId: string;
  listingId: string;
  createdByUserId: string | null;
  name: string;
  document: PlantaDocument;
  revision: number;
  areaLinks: FloorPlanAreaLink[];
  blueprint: FloorPlanBlueprintMetadata | null;
  createdAt: string;
  updatedAt: string;
};

export type ListingImage = {
  id: string;
  listingId?: string;
  url: string;
  position: number;
  isCover: boolean;
  sourceUrl?: string | null;
  storageKey?: string | null;
  fingerprint?: Record<string, unknown> | null;
};

export type ListingEnvironment = {
  id: string;
  listingId?: string;
  kind: string;
  name: string;
  ordinal?: number | null;
  position: number;
  imageIds?: string[];
  imageIndices?: number[];
  images: ListingImage[];
};
