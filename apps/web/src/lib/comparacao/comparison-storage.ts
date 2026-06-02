import type { Imovel } from "$lib/anuncios/types";
import {
  fillBlankComparisonSlots,
  normalizeComparisonSlots,
  type ComparisonSlot
} from "$lib/comparacao/comparison-helpers";
import type { FixedCell, NumericRowKey } from "$lib/comparacao/comparison-matrix";

export const COMPARISON_SELECTION_STORAGE_PREFIX = "minha-casa:comparison-selection";

const NUMERIC_ROW_KEYS = new Set<NumericRowKey>([
  "price",
  "totalArea",
  "privateArea",
  "rooms",
  "bathrooms",
  "garage"
]);

export function getComparisonSelectionStorageKey(collectionId: string) {
  return `${COMPARISON_SELECTION_STORAGE_PREFIX}:${collectionId}`;
}

export function resolveFixedCell(
  slots: ComparisonSlot[],
  fixedCell: FixedCell | null,
  visibleSlotCount = slots.length
): FixedCell | null {
  if (!fixedCell) return null;
  if (!NUMERIC_ROW_KEYS.has(fixedCell.rowKey)) return null;
  if (fixedCell.slotIndex < 0 || fixedCell.slotIndex >= visibleSlotCount) return null;
  if (!slots[fixedCell.slotIndex]) return null;
  return fixedCell;
}

export function readStoredComparisonSelection(
  collectionId: string,
  listings: Imovel[]
): { slots: ComparisonSlot[]; fixedCell: FixedCell | null } | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(getComparisonSelectionStorageKey(collectionId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { slots?: unknown; fixedCell?: unknown };
    if (!Array.isArray(parsed.slots)) return null;

    const slots = fillBlankComparisonSlots(
      normalizeComparisonSlots(
        parsed.slots.map((slot) => (typeof slot === "string" ? slot : null)),
        listings
      ),
      listings
    );
    if (!slots.some(Boolean)) return null;

    const rawFixedCell = parsed.fixedCell as Partial<FixedCell> | null;
    const fixedCell =
      rawFixedCell &&
      typeof rawFixedCell === "object" &&
      typeof rawFixedCell.rowKey === "string" &&
      typeof rawFixedCell.slotIndex === "number"
        ? resolveFixedCell(slots, {
            rowKey: rawFixedCell.rowKey as NumericRowKey,
            slotIndex: rawFixedCell.slotIndex
          })
        : null;

    return { slots, fixedCell };
  } catch {
    return null;
  }
}

export function writeStoredComparisonSelection(
  collectionId: string,
  slots: ComparisonSlot[],
  fixedCell: FixedCell | null
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    getComparisonSelectionStorageKey(collectionId),
    JSON.stringify({
      slots,
      fixedCell: resolveFixedCell(slots, fixedCell)
    })
  );
}
