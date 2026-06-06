import type { Imovel } from "$lib/anuncios/types";
import type { ListingImageCategoryKey } from "$lib/listing-image-categories";
import { normalizeCoverIndex } from "$lib/listing-image-categories";

export type ImageEnvironmentKind =
  | "areaExterna"
  | "sala"
  | "cozinha"
  | "quarto"
  | "banheiro"
  | "garagem"
  | "varanda"
  | "areaServico"
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
  areaExterna: "Área externa",
  sala: "Sala",
  cozinha: "Cozinha",
  quarto: "Quarto",
  banheiro: "Banheiro",
  garagem: "Garagem",
  varanda: "Varanda",
  areaServico: "Área de serviço",
  custom: "Outro"
};

const KIND_SORT_ORDER: ImageEnvironmentKind[] = [
  "areaExterna",
  "sala",
  "cozinha",
  "quarto",
  "banheiro",
  "garagem",
  "varanda",
  "areaServico",
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
  quartos: number | null;
  banheiros: number | null;
  garagem: number | null;
}): ImageEnvironmentColumn[] {
  const columns: ImageEnvironmentColumn[] = [
    createColumn("areaExterna", ENVIRONMENT_KIND_LABELS.areaExterna),
    createColumn("sala", ENVIRONMENT_KIND_LABELS.sala),
    createColumn("cozinha", ENVIRONMENT_KIND_LABELS.cozinha)
  ];

  for (let index = 1; index <= positiveCount(listing.quartos); index += 1) {
    columns.push(createColumn("quarto", `Quarto ${index}`, index));
  }

  for (let index = 1; index <= positiveCount(listing.banheiros); index += 1) {
    columns.push(createColumn("banheiro", `Banheiro ${index}`, index));
  }

  if (positiveCount(listing.garagem) > 0) {
    columns.push(createColumn("garagem", ENVIRONMENT_KIND_LABELS.garagem));
  }

  return columns;
}

function categoryToKind(category: ListingImageCategoryKey): {
  kind: ImageEnvironmentKind;
  ordinal?: number;
} {
  if (category === "fachada" || category === "areaExterna") {
    return { kind: "areaExterna" };
  }
  if (category === "sala") return { kind: "sala" };
  if (category.startsWith("quarto-")) {
    return { kind: "quarto", ordinal: Number(category.slice("quarto-".length)) || 1 };
  }
  if (category.startsWith("banheiro-")) {
    return { kind: "banheiro", ordinal: Number(category.slice("banheiro-".length)) || 1 };
  }
  return { kind: "custom" };
}

function findColumnForCategory(
  columns: ImageEnvironmentColumn[],
  category: ListingImageCategoryKey
): ImageEnvironmentColumn | undefined {
  const { kind, ordinal } = categoryToKind(category);
  if (kind === "quarto" || kind === "banheiro") {
    return (
      columns.find((column) => column.kind === kind && column.ordinal === ordinal) ??
      columns.find((column) => column.kind === kind)
    );
  }
  return columns.find((column) => column.kind === kind);
}

export function migrateFromImageCategories(
  categories: Record<string, ListingImageCategoryKey> | null | undefined,
  columns: ImageEnvironmentColumn[]
): ImageEnvironmentColumn[] {
  if (!categories || Object.keys(categories).length === 0) return columns;

  const next = columns.map((column) => ({ ...column, imageIndices: [...column.imageIndices] }));

  for (const [indexKey, category] of Object.entries(categories)) {
    const imageIndex = Number(indexKey);
    if (!Number.isInteger(imageIndex) || imageIndex < 0) continue;

    const column = findColumnForCategory(next, category);
    if (!column) continue;
    if (!column.imageIndices.includes(imageIndex)) {
      column.imageIndices.push(imageIndex);
    }
  }

  return next;
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
  listing: Pick<Imovel, "quartos" | "banheiros" | "garagem" | "imageEnvironments" | "imageCategories">,
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
    columns = migrateFromImageCategories(listing.imageCategories, columns);
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
    kind === "quarto" || kind === "banheiro"
      ? kindCount + 1
      : undefined;

  const resolvedLabel =
    (kind === "quarto" || kind === "banheiro") && label && !label.match(/\d/)
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
  { kind: "areaExterna", label: ENVIRONMENT_KIND_LABELS.areaExterna },
  { kind: "sala", label: ENVIRONMENT_KIND_LABELS.sala },
  { kind: "cozinha", label: ENVIRONMENT_KIND_LABELS.cozinha },
  { kind: "quarto", label: "Quarto" },
  { kind: "banheiro", label: "Banheiro" },
  { kind: "garagem", label: ENVIRONMENT_KIND_LABELS.garagem },
  { kind: "varanda", label: ENVIRONMENT_KIND_LABELS.varanda },
  { kind: "areaServico", label: ENVIRONMENT_KIND_LABELS.areaServico },
  { kind: "custom", label: "Outro" }
];
