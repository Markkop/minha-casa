import type {
  MergeGalleryItem,
  MergeGalleryStatus,
  MergeReviewField,
  MergeReviewSelection,
  MergeReviewSession,
  MergeReviewSuggestion
} from "$lib/components/anuncios/merge-review/types";
import { resolveListingImages } from "$lib/listing-images";

const EMPTY_VALUE = "Não informado";

const GALLERY_STATUS_ORDER: Record<MergeGalleryStatus, number> = {
  existing: 0,
  new: 1,
  duplicate: 2,
  failed: 3,
  limit_skipped: 4
};

type MergeGallerySession = Pick<
  MergeReviewSession,
  "gallery" | "targetListingId" | "currentData" | "importedData"
> & {
  images?: { id: string; previewUrl: string; width?: number; height?: number }[];
};

function listingImageUrlEntries(data: Record<string, unknown>): string[] {
  const urls = Array.isArray(data.imageUrls)
    ? data.imageUrls.filter((url): url is string => typeof url === "string" && url.trim() !== "")
    : [];

  if (urls.length > 0) return urls;

  return typeof data.imageUrl === "string" && data.imageUrl.trim() !== "" ? [data.imageUrl.trim()] : [];
}

function galleryItemUrl(item: Pick<MergeGalleryItem, "previewUrl" | "sourceUrl">): string | null {
  return item.sourceUrl ?? item.previewUrl ?? null;
}

function sortGalleryItems(items: MergeGalleryItem[]): MergeGalleryItem[] {
  return [...items].sort((left, right) => {
    const statusOrder =
      GALLERY_STATUS_ORDER[left.status] - GALLERY_STATUS_ORDER[right.status];
    if (statusOrder !== 0) return statusOrder;

    const leftIndex = parseIndexedRef(left.ref);
    const rightIndex = parseIndexedRef(right.ref);
    if (leftIndex !== null && rightIndex !== null) return leftIndex - rightIndex;

    return left.ref.localeCompare(right.ref);
  });
}

function parseIndexedRef(ref: string): number | null {
  const match = ref.match(/:(\d+)$/);
  return match ? Number(match[1]) : null;
}

function seedExistingGalleryItems(
  items: Map<string, MergeGalleryItem>,
  session: MergeGallerySession
): void {
  const existing = resolveListingImages({
    listingId: session.targetListingId,
    imageUrl: session.currentData.imageUrl as string | null | undefined,
    imageUrls: session.currentData.imageUrls as string[] | null | undefined,
    imageStorageKeys: session.currentData.imageStorageKeys as string[] | null | undefined,
    imageCoverIndex: session.currentData.imageCoverIndex as number | null | undefined
  });

  for (const [index, previewUrl] of existing.imageUrls.entries()) {
    const ref = `existing:${index}`;
    if (!items.has(ref)) {
      items.set(ref, {
        ref,
        status: "existing",
        previewUrl
      });
    }
  }
}

function normalizeGalleryItem(value: unknown): MergeGalleryItem | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const ref = record.ref;
  const status = record.status;
  const previewUrl = record.previewUrl;

  if (typeof ref !== "string" || typeof status !== "string" || typeof previewUrl !== "string") {
    return null;
  }

  return {
    ref,
    status: status as MergeGalleryStatus,
    previewUrl,
    sourceUrl: typeof record.sourceUrl === "string" ? record.sourceUrl : undefined,
    duplicateOf: typeof record.duplicateOf === "number" ? record.duplicateOf : undefined,
    width: typeof record.width === "number" ? record.width : undefined,
    height: typeof record.height === "number" ? record.height : undefined
  };
}

function importedUrlsAlreadyRepresented(items: Map<string, MergeGalleryItem>): Set<string> {
  const urls = new Set<string>();

  for (const item of items.values()) {
    if (item.status === "existing") continue;

    const previewUrl = galleryItemUrl(item);
    if (previewUrl) urls.add(previewUrl);
  }

  return urls;
}

function findDuplicateExistingIndex(
  sourceUrl: string,
  items: Map<string, MergeGalleryItem>
): number | null {
  for (const item of items.values()) {
    if (item.status !== "existing") continue;
    if (galleryItemUrl(item) === sourceUrl) {
      const index = parseIndexedRef(item.ref);
      if (index !== null) return index;
    }
  }

  return null;
}

function seedImportedGalleryItems(
  items: Map<string, MergeGalleryItem>,
  session: MergeGallerySession
): void {
  const representedImportedUrls = importedUrlsAlreadyRepresented(items);

  for (const sourceUrl of listingImageUrlEntries(session.importedData)) {
    if (representedImportedUrls.has(sourceUrl)) continue;

    const ref = `imported:${urlRefId(sourceUrl)}`;
    if (items.has(ref)) continue;

    const duplicateOf = findDuplicateExistingIndex(sourceUrl, items);

    items.set(ref, {
      ref,
      status: duplicateOf !== null ? "duplicate" : "new",
      previewUrl: sourceUrl,
      sourceUrl,
      ...(duplicateOf !== null ? { duplicateOf } : {})
    });
    representedImportedUrls.add(sourceUrl);
  }
}

function urlRefId(url: string): string {
  let hash = 2166136261;

  for (let index = 0; index < url.length; index += 1) {
    hash ^= url.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function resolveMergeGallery(session: MergeGallerySession): MergeGalleryItem[] {
  const items = new Map<string, MergeGalleryItem>();

  for (const raw of session.gallery ?? []) {
    const item = normalizeGalleryItem(raw);
    if (item) items.set(item.ref, item);
  }

  if (session.images?.length) {
    for (const image of session.images) {
      const ref = `new:${image.id}`;
      if (!items.has(ref)) {
        items.set(ref, {
          ref,
          status: "new",
          previewUrl: image.previewUrl,
          width: image.width,
          height: image.height
        });
      }
    }
  }

  seedExistingGalleryItems(items, session);
  seedImportedGalleryItems(items, session);

  return sortGalleryItems([...items.values()]);
}

export function isGalleryItemSelectable(item: MergeGalleryItem): boolean {
  return item.status === "existing" || item.status === "new" || item.status === "duplicate";
}

export function isFieldEditable(field: MergeReviewField): boolean {
  return field.valueType === "text";
}

export function serializeIncomingTextValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return String(value);
}

/** Valid suggestions are those that reference an actual diff field. */
export function mergeSuggestionMap(
  session: Pick<MergeReviewSession, "fields" | "suggestions">
): Map<string, MergeReviewSuggestion> {
  const fieldPaths = new Set(session.fields.map((field) => field.path));
  const map = new Map<string, MergeReviewSuggestion>();

  for (const suggestion of session.suggestions ?? []) {
    if (fieldPaths.has(suggestion.path) && !map.has(suggestion.path)) {
      map.set(suggestion.path, suggestion);
    }
  }

  return map;
}

export function hasMergeSuggestions(
  session: Pick<MergeReviewSession, "fields" | "suggestions">
): boolean {
  return mergeSuggestionMap(session).size > 0;
}

/** Fields shown by default: only suggested ones when suggestions exist. */
export function visibleMergeFields(
  session: Pick<MergeReviewSession, "fields" | "suggestions">,
  showAll: boolean
): MergeReviewField[] {
  const suggestions = mergeSuggestionMap(session);
  if (showAll || suggestions.size === 0) return session.fields;
  return session.fields.filter((field) => suggestions.has(field.path));
}

export function createDefaultMergeSelection(
  session: Pick<
    MergeReviewSession,
    "fields" | "gallery" | "targetListingId" | "currentData" | "importedData" | "suggestions"
  > &
    Pick<MergeGallerySession, "images">
): MergeReviewSelection {
  const suggestions = mergeSuggestionMap(session);
  const fieldValues: Record<string, string | number | boolean> = {};

  for (const field of session.fields) {
    const suggestion = suggestions.get(field.path);

    if (isFieldEditable(field)) {
      fieldValues[field.path] = serializeIncomingTextValue(
        suggestion ? suggestion.suggestedValue : field.incomingValue
      );
    } else if (
      suggestion &&
      (typeof suggestion.suggestedValue === "number" || typeof suggestion.suggestedValue === "boolean")
    ) {
      fieldValues[field.path] = suggestion.suggestedValue;
    }
  }

  const gallery = resolveMergeGallery(session);

  return {
    fieldPaths:
      suggestions.size > 0
        ? session.fields.filter((field) => suggestions.has(field.path)).map((field) => field.path)
        : session.fields.map((field) => field.path),
    fieldValues,
    imageRefs: gallery
      .filter((item) => item.status === "existing" || item.status === "new")
      .map((item) => item.ref)
  };
}

export function setMergeSelectionItem(
  selectedIds: readonly string[],
  id: string,
  selected: boolean
): string[] {
  if (selected) {
    return selectedIds.includes(id) ? [...selectedIds] : [...selectedIds, id];
  }

  return selectedIds.filter((selectedId) => selectedId !== id);
}

export function hasMergeSelection(selection: MergeReviewSelection): boolean {
  return selection.fieldPaths.length > 0 || selection.imageRefs.length > 0;
}

export function groupMergeFields(fields: readonly MergeReviewField[]): Map<string, MergeReviewField[]> {
  const groups = new Map<string, MergeReviewField[]>();

  for (const field of fields) {
    const groupFields = groups.get(field.group) ?? [];
    groupFields.push(field);
    groups.set(field.group, groupFields);
  }

  return groups;
}

export function formatMergeValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return EMPTY_VALUE;
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "number") return new Intl.NumberFormat("pt-BR").format(value);
  if (value instanceof Date) return value.toLocaleDateString("pt-BR");

  if (Array.isArray(value)) {
    return value.length > 0 ? value.map(formatMergeValue).join(", ") : EMPTY_VALUE;
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

export function galleryStatusLabel(status: MergeGalleryItem["status"]): string {
  switch (status) {
    case "existing":
      return "Atual";
    case "new":
      return "Nova";
    case "duplicate":
      return "Duplicada";
    case "failed":
      return "Falhou";
    case "limit_skipped":
      return "Fora do limite";
    default:
      return status;
  }
}
