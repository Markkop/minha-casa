export interface GalleryImage {
  url: string;
  originalIndex: number;
}

export function normalizeCoverIndex(index: number | null | undefined, length: number) {
  return typeof index === "number" && Number.isInteger(index) && index >= 0 && index < length
    ? index
    : 0;
}
