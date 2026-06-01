<script lang="ts">
  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";

  type TooltipSide = "top" | "right" | "bottom" | "left";

  let {
    children,
    class: className = "",
    side = "top"
  }: {
    children?: Snippet;
    class?: string;
    side?: TooltipSide;
  } = $props();

  const sidePositionClass: Record<TooltipSide, string> = {
    top: "bottom-full left-1/2 mb-1 -translate-x-1/2",
    right: "left-full top-1/2 ml-1 -translate-y-1/2",
    bottom: "top-full left-1/2 mt-1 -translate-x-1/2",
    left: "right-full top-1/2 mr-1 -translate-y-1/2"
  };
</script>

<span
  role="tooltip"
  data-slot="tooltip-content"
  class={cn(
    "pointer-events-none absolute z-50 w-fit max-w-[min(100vw-2rem,16rem)] origin-center rounded-md border border-app-border bg-app-surface px-3 py-1.5 text-xs text-balance text-app-fg opacity-0 shadow-sm transition-opacity",
    "group-hover/ui-tooltip:opacity-100 group-focus-within/ui-tooltip:opacity-100",
    sidePositionClass[side],
    className
  )}
>
  {@render children?.()}
</span>
