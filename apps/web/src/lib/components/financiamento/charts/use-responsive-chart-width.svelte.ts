export function useResponsiveChartWidth(
  getContainer: () => HTMLElement | null,
  minWidth = 280
) {
  let containerWidth = $state(0);

  $effect(() => {
    const el = getContainer();
    if (!el || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width ?? 0;
      if (next > 0) containerWidth = next;
    });
    observer.observe(el);
    containerWidth = el.clientWidth;
    return () => observer.disconnect();
  });

  return {
    get containerWidth() {
      return containerWidth;
    },
    get chartWidth() {
      return Math.max(minWidth, containerWidth);
    }
  };
}
