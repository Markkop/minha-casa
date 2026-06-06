export type ListingImageCategoryKey =
  | `quarto-${number}`
  | `banheiro-${number}`
  | "sala"
  | "fachada"
  | "areaExterna";

export type CategorySelectValue = ListingImageCategoryKey | "none";

export interface GalleryImage {
  url: string;
  originalIndex: number;
}

const CATEGORY_ORDER = ["quarto", "banheiro", "sala", "fachada", "areaExterna"] as const;

export function normalizeCoverIndex(index: number | null | undefined, length: number) {
  return typeof index === "number" && Number.isInteger(index) && index >= 0 && index < length
    ? index
    : 0;
}

function positiveCount(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
}

export function buildCategoryOptions(listing: {
  quartos: number | null;
  banheiros: number | null;
}) {
  const quartos = Array.from({ length: positiveCount(listing.quartos) }, (_, index) => ({
    value: `quarto-${index + 1}` as ListingImageCategoryKey,
    label: `Quarto ${index + 1}`
  }));
  const banheiros = Array.from({ length: positiveCount(listing.banheiros) }, (_, index) => ({
    value: `banheiro-${index + 1}` as ListingImageCategoryKey,
    label: `Banheiro ${index + 1}`
  }));

  return [
    { value: "none" as const, label: "Sem categoria" },
    ...quartos,
    ...banheiros,
    { value: "sala" as const, label: "Sala" },
    { value: "areaExterna" as const, label: "Área externa" }
  ];
}

function categorySortTuple(category: ListingImageCategoryKey | undefined) {
  if (!category) return [CATEGORY_ORDER.length, 0] as const;
  if (category.startsWith("quarto-")) {
    return [0, Number(category.slice("quarto-".length)) || 0] as const;
  }
  if (category.startsWith("banheiro-")) {
    return [1, Number(category.slice("banheiro-".length)) || 0] as const;
  }
  const rank = CATEGORY_ORDER.indexOf(category as (typeof CATEGORY_ORDER)[number]);
  return [rank >= 0 ? rank : CATEGORY_ORDER.length, 0] as const;
}

export function resolveGalleryImages(
  imageUrls: string[],
  coverIndex: number,
  categories: Record<string, ListingImageCategoryKey> | null | undefined
): GalleryImage[] {
  if (imageUrls.length === 0) return [];

  const originalOrder = imageUrls.map((_url, index) => index);
  const cover = normalizeCoverIndex(coverIndex, imageUrls.length);
  const rest = originalOrder
    .filter((index) => index !== cover)
    .sort((left, right) => {
      const [leftRank, leftOrdinal] = categorySortTuple(categories?.[String(left)]);
      const [rightRank, rightOrdinal] = categorySortTuple(categories?.[String(right)]);
      return leftRank - rightRank || leftOrdinal - rightOrdinal || left - right;
    });

  return [cover, ...rest].map((originalIndex) => ({
    originalIndex,
    url: imageUrls[originalIndex]
  }));
}
