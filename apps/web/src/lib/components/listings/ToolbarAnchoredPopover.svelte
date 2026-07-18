<script lang="ts">
  import type { Snippet } from "svelte";
  import {
    MAP_FLOATING_UI_Z_CLASS,
    MAP_FLOATING_UI_Z_INDEX
  } from "$lib/listings/listings-panel-layout";
  import AnchoredPopover from "$lib/components/ui/AnchoredPopover.svelte";
  import type { PanelAlign, PanelSide } from "$lib/floating-position";

  let {
    open = $bindable(false),
    align = "auto",
    side = "auto",
    offsetClass = "",
    offset = 8,
    panelClass = "",
    mapFloating = false,
    trigger,
    children
  }: {
    open?: boolean;
    align?: PanelAlign;
    side?: PanelSide;
    offsetClass?: string;
    offset?: number;
    panelClass?: string;
    /** Raise panel above embedded map tiles (Leaflet / Google). */
    mapFloating?: boolean;
    trigger: Snippet;
    children: Snippet;
  } = $props();
</script>

<AnchoredPopover
  bind:open
  {align}
  {side}
  {offsetClass}
  {offset}
  {panelClass}
  zIndexClass={mapFloating ? MAP_FLOATING_UI_Z_CLASS : "z-[1300]"}
  zIndexStyle={mapFloating ? String(MAP_FLOATING_UI_Z_INDEX) : ""}
  {trigger}
  {children}
/>
