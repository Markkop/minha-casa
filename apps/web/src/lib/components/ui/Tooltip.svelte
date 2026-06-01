<script lang="ts">
  import type { Snippet } from "svelte";
  import {
    TOOLTIP_SURFACE_COMPACT_CLASS,
    tooltipWrapClass,
    type TooltipWrapOption
  } from "$lib/components/ui/tooltip-content";
  import { cn } from "$lib/utils";

  type TooltipSide = "top" | "right" | "bottom" | "left";

  let {
    side = "top",
    wrap,
    text,
    contentClass = "",
    trigger,
    children
  }: {
    side?: TooltipSide;
    wrap?: TooltipWrapOption;
    text?: string;
    contentClass?: string;
    trigger: Snippet;
    children: Snippet;
  } = $props();

  const sidePositionClass: Record<TooltipSide, string> = {
    top: "bottom-full left-1/2 mb-1 -translate-x-1/2",
    right: "left-full top-1/2 ml-1 -translate-y-1/2",
    bottom: "top-full left-1/2 mt-1 -translate-x-1/2",
    left: "right-full top-1/2 mr-1 -translate-y-1/2"
  };
</script>

<span class="group/ui-tooltip relative inline-flex max-w-full">
  {@render trigger()}
  <span
    role="tooltip"
    class={cn(
      "pointer-events-none absolute z-50 text-app-fg opacity-0 transition-opacity",
      TOOLTIP_SURFACE_COMPACT_CLASS,
      tooltipWrapClass({ wrap, text }),
      "group-hover/ui-tooltip:opacity-100 group-focus-within/ui-tooltip:opacity-100",
      sidePositionClass[side],
      contentClass
    )}
  >
    {@render children()}
  </span>
</span>
