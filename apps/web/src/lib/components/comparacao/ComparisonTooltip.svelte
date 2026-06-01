<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils";

  type TooltipSide = "top" | "right" | "bottom";

  let {
    side = "top",
    contentClass = "",
    trigger,
    children
  }: {
    side?: TooltipSide;
    contentClass?: string;
    trigger: Snippet;
    children: Snippet;
  } = $props();

  const sidePositionClass: Record<TooltipSide, string> = {
    top: "bottom-full left-1/2 mb-1 -translate-x-1/2",
    right: "left-full top-1/2 ml-1 -translate-y-1/2",
    bottom: "top-full left-1/2 mt-1 -translate-x-1/2"
  };
</script>

<span class="group/comparison-tooltip relative inline-flex max-w-full">
  {@render trigger()}
  <span
    role="tooltip"
    class={cn(
      "pointer-events-none absolute z-50 w-fit max-w-[min(100vw-2rem,16rem)] whitespace-normal text-wrap rounded-md border border-app-border bg-app-surface px-2.5 py-1 text-xs leading-snug text-balance text-app-fg opacity-0 shadow-sm transition-opacity",
      "group-hover/comparison-tooltip:opacity-100 group-focus-within/comparison-tooltip:opacity-100",
      sidePositionClass[side],
      contentClass
    )}
  >
    {@render children()}
  </span>
</span>
