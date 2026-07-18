import type { Property } from "$lib/listings/types";
import { normalizeCoverIndex } from "$lib/listing-images-core";

export type ImageEnvironmentKind =
  | "exterior"
  | "livingRoom"
  | "kitchen"
  | "bedroom"
  | "bathroom"
  | "garage"
  | "balcony"
  | "utilityRoom"
  | "custom";

export interface ImageEnvironmentColumn {
  id: string;
  kind: ImageEnvironmentKind;
  label: string;
  ordinal?: number;
  imageIndices: number[];
}

export interface GalleryImage {
  url: string;
  originalIndex: number;
}

export const ENVIRONMENT_KIND_LABELS: Record<ImageEnvironmentKind, string> = {
  exterior: "Área externa",
  livingRoom: "Sala",
  kitchen: "Cozinha",
  bedroom: "Quarto",
  bathroom: "Banheiro",
  garage: "Garagem",
  balcony: "Varanda",
  utilityRoom: "Área de serviço",
  custom: "Outro"
};

const KIND_SORT_ORDER: ImageEnvironmentKind[] = [
  "exterior",
  "livingRoom",
  "kitchen",
  "bedroom",
  "bathroom",
  "garage",
  "balcony",
  "utilityRoom",
  "custom"
];

function positiveCount(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
}

export function createEnvironmentColumnId() {
  return crypto.randomUUID();
}

function createColumn(
  kind: ImageEnvironmentKind,
  label: string,
  ordinal?: number
): ImageEnvironmentColumn {
  return {
    id: createEnvironmentColumnId(),
    kind,
    label,
    ordinal,
    imageIndices: []
  };
}

export function buildDefaultEnvironmentColumns(listing: {
  bedrooms: number | null;
  bathrooms: number | null;
  parkingSpots: number | null;
}): ImageEnvironmentColumn[] {
  const columns: ImageEnvironmentColumn[] = [
    createColumn("exterior", ENVIRONMENT_KIND_LABELS.exterior),
    createColumn("livingRoom", ENVIRONMENT_KIND_LABELS.livingRoom),
    createColumn("kitchen", ENVIRONMENT_KIND_LABELS.kitchen)
  ];

  for (let index = 1; index <= positiveCount(listing.bedrooms); index += 1) {
    columns.push(createColumn("bedroom", `Quarto ${index}`, index));
  }

  for (let index = 1; index <= positiveCount(listing.bathrooms); index += 1) {
    columns.push(createColumn("bathroom", `Banheiro ${index}`, index));
  }

  if (positiveCount(listing.parkingSpots) > 0) {
    columns.push(createColumn("garage", ENVIRONMENT_KIND_LABELS.garage));
  }

  return columns;
}

export function filterStaleImageIndices(
  columns: ImageEnvironmentColumn[],
  imageCount: number
): ImageEnvironmentColumn[] {
  return columns.map((column) => ({
    ...column,
    imageIndices: column.imageIndices.filter(
      (index) => Number.isInteger(index) && index >= 0 && index < imageCount
    )
  }));
}

export function resolveEnvironmentColumns(
  listing: Pick<Property, "bedrooms" | "bathrooms" | "parkingSpots" | "imageEnvironments">,
  imageCount: number
): ImageEnvironmentColumn[] {
  let columns: ImageEnvironmentColumn[];

  if (listing.imageEnvironments && listing.imageEnvironments.length > 0) {
    columns = listing.imageEnvironments.map((column) => ({
      ...column,
      imageIndices: [...column.imageIndices]
    }));
  } else {
    columns = buildDefaultEnvironmentColumns(listing);
  }

  return filterStaleImageIndices(columns, imageCount);
}

export function getAssignedImageIndices(columns: ImageEnvironmentColumn[]): Set<number> {
  const assigned = new Set<number>();
  for (const column of columns) {
    for (const index of column.imageIndices) {
      assigned.add(index);
    }
  }
  return assigned;
}

export function getUnassignedImageIndices(
  columns: ImageEnvironmentColumn[],
  imageCount: number
): number[] {
  const assigned = getAssignedImageIndices(columns);
  return Array.from({ length: imageCount }, (_, index) => index).filter(
    (index) => !assigned.has(index)
  );
}

function columnSortTuple(column: ImageEnvironmentColumn): [number, number, number] {
  const kindRank = KIND_SORT_ORDER.indexOf(column.kind);
  const ordinal = column.ordinal ?? 0;
  return [kindRank >= 0 ? kindRank : KIND_SORT_ORDER.length, ordinal, 0];
}

export function sortEnvironmentColumns(columns: ImageEnvironmentColumn[]): ImageEnvironmentColumn[] {
  return [...columns].sort((left, right) => {
    const [leftKind, leftOrdinal] = columnSortTuple(left);
    const [rightKind, rightOrdinal] = columnSortTuple(right);
    return leftKind - rightKind || leftOrdinal - rightOrdinal || left.label.localeCompare(right.label, "pt-BR");
  });
}

export function reorderEnvironmentColumns(
  columns: ImageEnvironmentColumn[],
  columnId: string,
  beforeColumnId: string
): ImageEnvironmentColumn[] {
  if (columnId === beforeColumnId) return columns;

  const fromIndex = columns.findIndex((column) => column.id === columnId);
  const toIndex = columns.findIndex((column) => column.id === beforeColumnId);
  if (fromIndex < 0 || toIndex < 0) return columns;

  const next = [...columns];
  const [moved] = next.splice(fromIndex, 1);
  const insertAt = fromIndex < toIndex ? toIndex - 1 : toIndex;
  next.splice(insertAt, 0, moved);
  return next;
}

export function resolveGalleryImagesFromEnvironments(
  imageUrls: string[],
  coverIndex: number,
  columns: ImageEnvironmentColumn[] | null | undefined
): GalleryImage[] {
  if (imageUrls.length === 0) return [];

  const cover = normalizeCoverIndex(coverIndex, imageUrls.length);
  const assigned = new Set<number>();
  const ordered: number[] = [];

  if (columns && columns.length > 0) {
    for (const column of columns) {
      for (const index of column.imageIndices) {
        if (index === cover || assigned.has(index)) continue;
        if (index >= 0 && index < imageUrls.length) {
          ordered.push(index);
          assigned.add(index);
        }
      }
    }
  }

  const unassigned = Array.from({ length: imageUrls.length }, (_, index) => index)
    .filter((index) => index !== cover && !assigned.has(index))
    .sort((left, right) => left - right);

  return [cover, ...ordered, ...unassigned].map((originalIndex) => ({
    originalIndex,
    url: imageUrls[originalIndex]
  }));
}

export function findColumnForImage(
  columns: ImageEnvironmentColumn[],
  imageIndex: number
): ImageEnvironmentColumn | undefined {
  return columns.find((column) => column.imageIndices.includes(imageIndex));
}

export function removeImageFromColumns(
  columns: ImageEnvironmentColumn[],
  imageIndex: number
): ImageEnvironmentColumn[] {
  return columns.map((column) => ({
    ...column,
    imageIndices: column.imageIndices.filter((index) => index !== imageIndex)
  }));
}

export function assignImageToColumn(
  columns: ImageEnvironmentColumn[],
  imageIndex: number,
  targetColumnId: string,
  position?: number
): ImageEnvironmentColumn[] {
  const without = removeImageFromColumns(columns, imageIndex);
  return without.map((column) => {
    if (column.id !== targetColumnId) return column;
    const nextIndices = [...column.imageIndices];
    const insertAt =
      typeof position === "number" && position >= 0 && position <= nextIndices.length
        ? position
        : nextIndices.length;
    nextIndices.splice(insertAt, 0, imageIndex);
    return { ...column, imageIndices: nextIndices };
  });
}

export function moveImageWithinColumn(
  columns: ImageEnvironmentColumn[],
  columnId: string,
  fromPosition: number,
  toPosition: number
): ImageEnvironmentColumn[] {
  return columns.map((column) => {
    if (column.id !== columnId) return column;
    const nextIndices = [...column.imageIndices];
    if (fromPosition < 0 || fromPosition >= nextIndices.length) return column;
    const [moved] = nextIndices.splice(fromPosition, 1);
    const insertAt = Math.max(0, Math.min(toPosition, nextIndices.length));
    nextIndices.splice(insertAt, 0, moved);
    return { ...column, imageIndices: nextIndices };
  });
}

export function unassignImage(
  columns: ImageEnvironmentColumn[],
  imageIndex: number
): ImageEnvironmentColumn[] {
  return removeImageFromColumns(columns, imageIndex);
}

export function addEnvironmentColumn(
  columns: ImageEnvironmentColumn[],
  kind: ImageEnvironmentKind = "custom",
  label?: string
): ImageEnvironmentColumn[] {
  const kindCount = columns.filter((column) => column.kind === kind).length;
  const defaultLabel =
    label ??
    (kind === "custom"
      ? kindCount > 0
        ? `Outro ${kindCount + 1}`
        : ENVIRONMENT_KIND_LABELS.custom
      : ENVIRONMENT_KIND_LABELS[kind]);

  const ordinal =
    kind === "bedroom" || kind === "bathroom"
      ? kindCount + 1
      : undefined;

  const resolvedLabel =
    (kind === "bedroom" || kind === "bathroom") && label && !label.match(/\d/)
      ? `${label} ${ordinal}`
      : defaultLabel;

  return [...columns, createColumn(kind, resolvedLabel, ordinal)];
}

export function removeEnvironmentColumn(
  columns: ImageEnvironmentColumn[],
  columnId: string
): ImageEnvironmentColumn[] {
  return columns.filter((column) => column.id !== columnId);
}

export function updateColumnLabel(
  columns: ImageEnvironmentColumn[],
  columnId: string,
  label: string
): ImageEnvironmentColumn[] {
  return columns.map((column) =>
    column.id === columnId ? { ...column, label: label.trim() || column.label } : column
  );
}

export const ADD_COLUMN_PRESETS: { kind: ImageEnvironmentKind; label: string }[] = [
  { kind: "exterior", label: ENVIRONMENT_KIND_LABELS.exterior },
  { kind: "livingRoom", label: ENVIRONMENT_KIND_LABELS.livingRoom },
  { kind: "kitchen", label: ENVIRONMENT_KIND_LABELS.kitchen },
  { kind: "bedroom", label: "Quarto" },
  { kind: "bathroom", label: "Banheiro" },
  { kind: "garage", label: ENVIRONMENT_KIND_LABELS.garage },
  { kind: "balcony", label: ENVIRONMENT_KIND_LABELS.balcony },
  { kind: "utilityRoom", label: ENVIRONMENT_KIND_LABELS.utilityRoom },
  { kind: "custom", label: "Outro" }
];
