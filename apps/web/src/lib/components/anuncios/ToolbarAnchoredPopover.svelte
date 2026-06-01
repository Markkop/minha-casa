<script lang="ts">
  import type { Snippet } from "svelte";
  import { popoverOutside } from "$lib/actions/popover-outside";
  import {
    MAP_FLOATING_UI_Z_CLASS,
    MAP_FLOATING_UI_Z_INDEX
  } from "$lib/anuncios/listings-panel-layout";
  import { cn } from "$lib/utils";

  let {
    open = $bindable(false),
    align = "end",
    offsetClass = "mt-2",
    panelClass = "",
    mapFloating = false,
    trigger,
    children
  }: {
    open?: boolean;
    align?: "start" | "end";
    offsetClass?: string;
    panelClass?: string;
    /** Raise panel above embedded map tiles (Leaflet / Google). */
    mapFloating?: boolean;
    trigger: Snippet;
    children: Snippet;
  } = $props();
</script>

<div
  class="relative shrink-0"
  use:popoverOutside={{
    enabled: () => open,
    onClose: () => (open = false)
  }}
>
  {@render trigger()}
  {#if open}
    <div
      class={cn(
        "absolute top-full rounded-md border border-app-border bg-app-surface text-app-fg shadow-lg",
        mapFloating ? MAP_FLOATING_UI_Z_CLASS : "z-50",
        offsetClass,
        align === "end" ? "right-0" : "left-0",
        panelClass
      )}
      style={mapFloating ? `z-index: ${MAP_FLOATING_UI_Z_INDEX}` : undefined}
    >
      {@render children()}
    </div>
  {/if}
</div>
