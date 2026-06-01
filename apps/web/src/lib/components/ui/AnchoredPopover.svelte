<script lang="ts">
  import { onDestroy, tick } from "svelte";
  import type { Snippet } from "svelte";
  import { popoverOutside } from "$lib/actions/popover-outside";
  import { portal } from "$lib/actions/portal";
  import {
    computeAnchoredPanelPlacement,
    panelPlacementToStyle,
    type PanelAlign,
    type PanelSide
  } from "$lib/floating-position";
  import { cn } from "$lib/utils";

  let {
    open = $bindable(false),
    align = "auto",
    side = "auto",
    offsetClass = "",
    offset = 8,
    panelClass = "",
    rootClass = "relative shrink-0",
    zIndexClass = "z-[1300]",
    zIndexStyle = "",
    onClose,
    trigger,
    children
  }: {
    open?: boolean;
    align?: PanelAlign;
    side?: PanelSide;
    offsetClass?: string;
    offset?: number;
    panelClass?: string;
    rootClass?: string;
    zIndexClass?: string;
    /** Numeric z-index appended to inline style (e.g. map overlays). */
    zIndexStyle?: string;
    /** Called when the popover closes (outside click, Escape, or open set to false). */
    onClose?: () => void;
    trigger: Snippet;
    children: Snippet;
  } = $props();

  function close() {
    open = false;
    onClose?.();
  }

  let rootRef = $state<HTMLDivElement | null>(null);
  let panelRef = $state<HTMLDivElement | null>(null);
  let panelStyle = $state("position: fixed; top: -9999px; left: -9999px;");
  let resizeObserver: ResizeObserver | null = null;

  async function updatePosition() {
    if (!open || !rootRef || !panelRef) return;
    await tick();
    if (!rootRef || !panelRef) return;

    const triggerRect = rootRef.getBoundingClientRect();
    const panelRect = panelRef.getBoundingClientRect();
    const placement = computeAnchoredPanelPlacement(triggerRect, panelRect, {
      offset,
      preferredAlign: align,
      preferredSide: side
    });
    panelStyle = panelPlacementToStyle(placement);
  }

  function observePanel() {
    resizeObserver?.disconnect();
    if (!panelRef || typeof ResizeObserver === "undefined") return;
    resizeObserver = new ResizeObserver(() => {
      void updatePosition();
    });
    resizeObserver.observe(panelRef);
  }

  $effect(() => {
    if (!open) {
      resizeObserver?.disconnect();
      resizeObserver = null;
      return;
    }
    void updatePosition();
    observePanel();
    return () => {
      resizeObserver?.disconnect();
      resizeObserver = null;
    };
  });

  onDestroy(() => {
    resizeObserver?.disconnect();
  });
</script>

<svelte:window onresize={updatePosition} onscroll={updatePosition} />

<div
  bind:this={rootRef}
  class={rootClass}
  use:popoverOutside={{
    enabled: () => open,
    onClose: close,
    extraRoots: () => [panelRef]
  }}
>
  {@render trigger()}
</div>

{#if open}
  <div
    bind:this={panelRef}
    use:portal
    use:popoverOutside={{
      enabled: () => open,
      onClose: close,
      extraRoots: () => [rootRef]
    }}
    class={cn(
      "rounded-md border border-app-border bg-app-surface text-app-fg shadow-lg",
      zIndexClass,
      offsetClass,
      panelClass
    )}
    style={zIndexStyle ? `${panelStyle} z-index: ${zIndexStyle}` : panelStyle}
  >
    {@render children()}
  </div>
{/if}
