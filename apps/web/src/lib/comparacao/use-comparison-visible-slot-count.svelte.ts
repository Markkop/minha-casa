import {
  COMPARISON_SLOT_COUNT_WIDE_QUERY,
  getComparisonVisibleSlotCount
} from "$lib/comparacao/comparison-helpers";

export function createComparisonVisibleSlotCount() {
  let visibleSlotCount = $state(
    typeof window !== "undefined"
      ? getComparisonVisibleSlotCount(
          window.matchMedia(COMPARISON_SLOT_COUNT_WIDE_QUERY).matches
        )
      : getComparisonVisibleSlotCount(true)
  );

  $effect(() => {
    const mediaQuery = window.matchMedia(COMPARISON_SLOT_COUNT_WIDE_QUERY);
    const syncSlotCount = () => {
      visibleSlotCount = getComparisonVisibleSlotCount(mediaQuery.matches);
    };
    syncSlotCount();
    mediaQuery.addEventListener("change", syncSlotCount);
    return () => mediaQuery.removeEventListener("change", syncSlotCount);
  });

  return {
    get current() {
      return visibleSlotCount;
    }
  };
}
