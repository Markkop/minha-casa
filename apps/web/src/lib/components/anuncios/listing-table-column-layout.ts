import { truncateListingTitle } from "$lib/components/anuncios/listing-title-display";

export const LISTING_TABLE_PROPERTY_TITLE_MAX_LENGTH = 50;

/** Matches `ListingTitleLinks` title anchor typography for measurement. */
export const LISTING_TABLE_TITLE_MEASURE_CLASS =
  "whitespace-nowrap text-sm font-medium leading-snug";

export const LISTING_TABLE_CLASS =
  "w-full min-w-[920px] table-auto border-collapse text-left text-sm";

export const LISTING_PROPERTY_COLUMN_ACTIONS_PX = 28;
export const LISTING_PROPERTY_COLUMN_PADDING_PX = 16;
export const LISTING_PROPERTY_COLUMN_MIN_PX = 160;
export const LISTING_PENDING_REVIEW_MAX_PX = 560;

export const LISTING_TABLE_HEADER_CENTER_CLASS = "text-center";

export const LISTING_TABLE_IMAGE_CELL_CLASS =
  "sticky left-0 z-20 w-[5.5rem] bg-app-surface p-2 align-middle whitespace-nowrap";

export const LISTING_TABLE_IMAGE_HEADER_CLASS = `${LISTING_TABLE_IMAGE_CELL_CLASS} ${LISTING_TABLE_HEADER_CENTER_CLASS}`;

export const LISTING_TABLE_IMAGE_BODY_CELL_CLASS = `${LISTING_TABLE_IMAGE_CELL_CLASS} ${LISTING_TABLE_HEADER_CENTER_CLASS}`;

export const LISTING_TABLE_PROPERTY_CELL_CLASS =
  "overflow-hidden px-2 py-2 align-middle [width:var(--listing-property-col-w)] [max-width:var(--listing-property-col-w)]";

export const LISTING_TABLE_PROPERTY_HEADER_CLASS =
  "overflow-hidden p-2 align-middle [width:var(--listing-property-col-w)] [max-width:var(--listing-property-col-w)]";

export const LISTING_TABLE_DATA_CELL_CLASS =
  "px-2 py-2 align-middle whitespace-nowrap";

export const LISTING_TABLE_DATA_HEADER_CLASS = `${LISTING_TABLE_DATA_CELL_CLASS} ${LISTING_TABLE_HEADER_CENTER_CLASS}`;

export const LISTING_TABLE_DATA_CELL_CENTER_CLASS = LISTING_TABLE_DATA_HEADER_CLASS;

export const LISTING_TABLE_COMPACT_CELL_CLASS = "px-2 py-2 align-middle whitespace-nowrap";

/** @deprecated Use LISTING_TABLE_COMPACT_CELL_CLASS */
export const LISTING_TABLE_COMPACT_HEADER_CLASS = LISTING_TABLE_COMPACT_CELL_CLASS;

export const LISTING_TABLE_COMPACT_HEADER_CENTER_CLASS = `${LISTING_TABLE_COMPACT_CELL_CLASS} ${LISTING_TABLE_HEADER_CENTER_CLASS}`;

export const LISTING_TABLE_COMPACT_CELL_CENTER_CLASS = LISTING_TABLE_COMPACT_HEADER_CENTER_CLASS;

export const LISTING_TABLE_ETAPA_HEADER_CLASS =
  "w-[8.5rem] min-w-[8.5rem] px-2 py-2 text-center align-middle text-app-muted whitespace-nowrap";

export const LISTING_TABLE_ETAPA_CELL_CLASS =
  "w-[8.5rem] min-w-[8.5rem] px-2 py-2 align-middle whitespace-nowrap";

export const LISTING_TABLE_ETAPA_CELL_CENTER_CLASS = `${LISTING_TABLE_ETAPA_CELL_CLASS} ${LISTING_TABLE_HEADER_CENTER_CLASS}`;

export function listingTablePropertyWidthStyle(widthPx: number): string {
  return `--listing-property-col-w: ${widthPx}px`;
}

export function longestDisplayedTitle(
  titles: readonly string[],
  maxLength = LISTING_TABLE_PROPERTY_TITLE_MAX_LENGTH
): string {
  let longest = "";
  for (const title of titles) {
    const displayed = truncateListingTitle(title, maxLength);
    if (displayed.length > longest.length) {
      longest = displayed;
    }
  }
  return longest;
}

export function computeListingPropertyColumnWidthPx(
  maxTextWidthPx: number,
  options?: { minWidthPx?: number }
): number {
  const floor = options?.minWidthPx ?? LISTING_PROPERTY_COLUMN_MIN_PX;
  return Math.max(
    floor,
    Math.ceil(maxTextWidthPx + LISTING_PROPERTY_COLUMN_ACTIONS_PX + LISTING_PROPERTY_COLUMN_PADDING_PX)
  );
}

export function pendingReviewPropertyMinWidthPx(viewportWidth: number): number {
  return Math.min(LISTING_PENDING_REVIEW_MAX_PX, Math.round(viewportWidth * 0.7));
}
