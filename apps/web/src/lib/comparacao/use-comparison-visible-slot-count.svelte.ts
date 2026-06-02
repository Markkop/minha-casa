import {
  COMPARISON_SLOT_COUNT_MAX,
  COMPARISON_SLOT_COUNT_NARROW_QUERY,
  COMPARISON_SLOT_COUNT_WIDE_QUERY,
  getComparisonVisibleSlotCount,
  readComparisonVisibleSlotCountFromWindow
} from "$lib/comparacao/comparison-helpers";

export function createComparisonVisibleSlotCount() {
  let visibleSlotCount = $state(
    typeof window !== "undefined"
      ? readComparisonVisibleSlotCountFromWindow()
      : COMPARISON_SLOT_COUNT_MAX
  );

  $effect(() => {
    const narrowMediaQuery = window.matchMedia(COMPARISON_SLOT_COUNT_NARROW_QUERY);
    const wideMediaQuery = window.matchMedia(COMPARISON_SLOT_COUNT_WIDE_QUERY);
    const syncSlotCount = () => {
      visibleSlotCount = getComparisonVisibleSlotCount({
        matchesNarrowViewport: narrowMediaQuery.matches,
        matchesWideViewport: wideMediaQuery.matches
      });
    };
    syncSlotCount();
    narrowMediaQuery.addEventListener("change", syncSlotCount);
    wideMediaQuery.addEventListener("change", syncSlotCount);
    return () => {
      narrowMediaQuery.removeEventListener("change", syncSlotCount);
      wideMediaQuery.removeEventListener("change", syncSlotCount);
    };
  });

  return {
    get current() {
      return visibleSlotCount;
    }
  };
}
