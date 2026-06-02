import { COMPARISON_MOBILE_LAYOUT_QUERY } from "$lib/comparacao/comparison-helpers";

export function createComparisonMobileLayout() {
  let isMobileLayout = $state(
    typeof window !== "undefined"
      ? window.matchMedia(COMPARISON_MOBILE_LAYOUT_QUERY).matches
      : false
  );

  $effect(() => {
    const mediaQuery = window.matchMedia(COMPARISON_MOBILE_LAYOUT_QUERY);
    const syncLayout = () => {
      isMobileLayout = mediaQuery.matches;
    };
    syncLayout();
    mediaQuery.addEventListener("change", syncLayout);
    return () => mediaQuery.removeEventListener("change", syncLayout);
  });

  return {
    get current() {
      return isMobileLayout;
    }
  };
}
