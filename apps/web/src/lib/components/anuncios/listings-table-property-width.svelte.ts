import {
  computeListingPropertyColumnWidthPx,
  LISTING_PROPERTY_COLUMN_MIN_PX,
  LISTING_TABLE_PROPERTY_TITLE_MAX_LENGTH,
  LISTING_TABLE_TITLE_MEASURE_CLASS,
  longestDisplayedTitle,
  pendingReviewPropertyMinWidthPx
} from "$lib/components/anuncios/listing-table-column-layout";

export function buildPropertyColumnMeasureText(
  titles: readonly string[],
  maxLength = LISTING_TABLE_PROPERTY_TITLE_MAX_LENGTH
): string {
  if (titles.length === 0) return "";
  return longestDisplayedTitle(titles, maxLength);
}

export function createListingsTablePropertyColumnWidth(options: {
  getMeasureEl: () => HTMLSpanElement | null;
  getMeasureText: () => string;
  getHasPendingReview: () => boolean;
  getEnabled: () => boolean;
}) {
  let widthPx = $state(LISTING_PROPERTY_COLUMN_MIN_PX);

  function measure() {
    if (!options.getEnabled()) return;

    const el = options.getMeasureEl();
    const reviewMin = options.getHasPendingReview()
      ? pendingReviewPropertyMinWidthPx(
          typeof window !== "undefined" ? window.innerWidth : 1200
        )
      : undefined;

    if (!el) {
      widthPx = computeListingPropertyColumnWidthPx(0, { minWidthPx: reviewMin });
      return;
    }

    const text = options.getMeasureText();
    el.textContent = text || " ";
    const textWidth = el.getBoundingClientRect().width;
    widthPx = computeListingPropertyColumnWidthPx(textWidth, { minWidthPx: reviewMin });
  }

  $effect(() => {
    options.getMeasureText();
    options.getHasPendingReview();
    options.getEnabled();
    options.getMeasureEl();
    measure();
  });

  $effect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  });

  return {
    get widthPx() {
      return widthPx;
    },
    measureClass: LISTING_TABLE_TITLE_MEASURE_CLASS
  };
}
