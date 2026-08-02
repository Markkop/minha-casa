<script lang="ts">
  import { onDestroy, tick } from "svelte";
  import { popoverOutside } from "$lib/actions/popover-outside";
  import { portal } from "$lib/actions/portal";
  import {
    computeAnchoredPanelPlacement,
    panelPlacementToStyle
  } from "$lib/floating-position";
  import { cn } from "$lib/utils";

  let {
    content,
    class: className = ""
  }: {
    content: string;
    class?: string;
  } = $props();

  let pinned = $state(false);
  let hover = $state(false);
  let open = $derived(pinned || hover);

  let rootRef = $state<HTMLSpanElement | null>(null);
  let panelRef = $state<HTMLDivElement | null>(null);
  let panelStyle = $state("position: fixed; top: -9999px; left: -9999px;");

  function dismiss() {
    pinned = false;
  }

  async function updatePosition() {
    if (!open || !rootRef || !panelRef) return;
    await tick();
    if (!rootRef || !panelRef) return;

    const triggerRect = rootRef.getBoundingClientRect();
    const panelRect = panelRef.getBoundingClientRect();
    const placement = computeAnchoredPanelPlacement(triggerRect, panelRect, {
      offset: 8,
      preferredAlign: "center",
      preferredSide: "top"
    });
    panelStyle = panelPlacementToStyle(placement);
  }

  $effect(() => {
    if (!open) return;
    void updatePosition();
  });

  onDestroy(() => {
    panelRef = null;
  });
</script>

<svelte:window onresize={updatePosition} onscroll={updatePosition} />

<span
  bind:this={rootRef}
  class="inline-flex"
  use:popoverOutside={{
    enabled: () => open,
    onClose: dismiss,
    extraRoots: () => [panelRef]
  }}
>
  <button
    type="button"
    class={cn(
      "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-app-border text-[10px] font-semibold leading-none text-app-subtle transition-colors hover:border-app-accent hover:text-app-accent",
      className
    )}
    aria-label="Mais informações"
    aria-expanded={open}
    onpointerenter={() => (hover = true)}
    onpointerleave={() => (hover = false)}
    onfocusin={() => (hover = true)}
    onfocusout={() => (hover = false)}
    onclick={(event) => {
      event.preventDefault();
      pinned = !pinned;
    }}
  >
    ?
  </button>
</span>

{#if open}
  <div
    bind:this={panelRef}
    role="tooltip"
    use:portal
    use:popoverOutside={{
      enabled: () => open,
      onClose: dismiss,
      extraRoots: () => [rootRef]
    }}
    class="z-[1300] max-w-[220px] rounded-md border border-app-border bg-app-surface px-3 py-2 text-xs leading-snug text-app-muted shadow-lg"
    style={panelStyle}
  >
    {content}
  </div>
{/if}
