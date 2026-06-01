<script lang="ts">
  import { tick } from "svelte";
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
    offsetClass = "",
    offset = 8,
    panelClass = "",
    mapFloating = false,
    trigger,
    children
  }: {
    open?: boolean;
    align?: "start" | "end";
    offsetClass?: string;
    offset?: number;
    panelClass?: string;
    /** Raise panel above embedded map tiles (Leaflet / Google). */
    mapFloating?: boolean;
    trigger: Snippet;
    children: Snippet;
  } = $props();

  let rootRef = $state<HTMLDivElement | null>(null);
  let panelRef = $state<HTMLDivElement | null>(null);
  let panelStyle = $state("position: fixed; top: -9999px; left: -9999px;");

  async function updatePosition() {
    if (!open || !rootRef || !panelRef) return;
    await tick();
    if (!rootRef || !panelRef) return;

    const triggerRect = rootRef.getBoundingClientRect();
    const panelRect = panelRef.getBoundingClientRect();
    const viewportPadding = 8;
    const bottomTop = triggerRect.bottom + offset;
    const topTop = triggerRect.top - panelRect.height - offset;
    const spaceBelow = window.innerHeight - triggerRect.bottom - offset - viewportPadding;
    const spaceAbove = triggerRect.top - offset - viewportPadding;
    const useAbove = panelRect.height > spaceBelow && spaceAbove > spaceBelow;
    const preferredTop = useAbove ? topTop : bottomTop;
    const maxHeight = Math.max(
      96,
      useAbove ? spaceAbove : spaceBelow
    );
    const top = Math.min(
      Math.max(viewportPadding, preferredTop),
      Math.max(viewportPadding, window.innerHeight - Math.min(panelRect.height, maxHeight) - viewportPadding)
    );

    if (align === "end") {
      const right = Math.min(
        Math.max(window.innerWidth - triggerRect.right, viewportPadding),
        Math.max(viewportPadding, window.innerWidth - panelRect.width - viewportPadding)
      );
      panelStyle = `position: fixed; top: ${top}px; right: ${right}px; max-height: ${maxHeight}px; overflow-y: auto;`;
    } else {
      const left = Math.min(
        Math.max(triggerRect.left, viewportPadding),
        Math.max(viewportPadding, window.innerWidth - panelRect.width - viewportPadding)
      );
      panelStyle = `position: fixed; top: ${top}px; left: ${left}px; max-height: ${maxHeight}px; overflow-y: auto;`;
    }
  }

  $effect(() => {
    if (open) void updatePosition();
  });
</script>

<svelte:window onresize={updatePosition} onscroll={updatePosition} />

<div
  bind:this={rootRef}
  class="relative shrink-0"
  use:popoverOutside={{
    enabled: () => open,
    onClose: () => (open = false)
  }}
>
  {@render trigger()}
  {#if open}
    <div
      bind:this={panelRef}
      class={cn(
        "rounded-md border border-app-border bg-app-surface text-app-fg shadow-lg",
        mapFloating ? MAP_FLOATING_UI_Z_CLASS : "z-[1300]",
        offsetClass,
        panelClass
      )}
      style={mapFloating ? `${panelStyle} z-index: ${MAP_FLOATING_UI_Z_INDEX}` : panelStyle}
    >
      {@render children()}
    </div>
  {/if}
</div>
