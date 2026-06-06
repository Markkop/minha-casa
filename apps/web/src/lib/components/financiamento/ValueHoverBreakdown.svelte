<script lang="ts">
  import { onDestroy, tick, type Snippet } from "svelte";
  import { TOOLTIP_SURFACE_FLOATING_CLASS } from "$lib/components/ui/tooltip-content";
  import { formatCurrency } from "$lib/financiamento/calculations";
  import { computeTooltipPlacement } from "$lib/floating-position";
  import { cn } from "$lib/utils";

  export interface BreakdownRow {
    label: string;
    value: number;
  }

  let {
    rows,
    children
  }: {
    rows: BreakdownRow[];
    children: Snippet;
  } = $props();

  const hasBreakdown = $derived(rows.length > 0);

  function formatCurrencyCompactAmount(value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
    return formatCurrency(value).replace(/^R\$\s*/, "");
  }

  let triggerRef = $state<HTMLSpanElement | null>(null);
  let panelRef = $state<HTMLDivElement | null>(null);
  let open = $state(false);
  let panelStyle = $state("left: -9999px; top: -9999px");

  function appendToBody(node: HTMLDivElement) {
    document.body.appendChild(node);
    return {
      destroy() {
        node.remove();
      }
    };
  }

  async function updatePosition() {
    if (!open || !hasBreakdown || !triggerRef || !panelRef) return;
    await tick();
    if (!triggerRef || !panelRef) return;

    const triggerRect = triggerRef.getBoundingClientRect();
    const panelRect = panelRef.getBoundingClientRect();
    const placement = computeTooltipPlacement(
      triggerRect,
      panelRect,
      "bottom",
      6,
      undefined,
      "center"
    );

    panelStyle = `left: ${placement.left}px; top: ${placement.top}px`;
  }

  function show() {
    if (!hasBreakdown) return;
    open = true;
    void updatePosition();
  }

  function hide() {
    open = false;
  }

  $effect(() => {
    if (!open || !hasBreakdown) return;
    void updatePosition();
  });

  onDestroy(() => {
    open = false;
  });
</script>

<svelte:window onresize={updatePosition} onscroll={updatePosition} />

<span
  bind:this={triggerRef}
  role="presentation"
  class="inline"
  onpointerenter={show}
  onpointerleave={hide}
  onfocusin={show}
  onfocusout={hide}
>
  {@render children()}
</span>

{#if open && hasBreakdown}
  <div
    bind:this={panelRef}
    use:appendToBody
    role="tooltip"
    class={cn(
      "pointer-events-none fixed z-[2147483000]",
      TOOLTIP_SURFACE_FLOATING_CLASS,
      "px-2 py-1.5 text-[11px] leading-tight"
    )}
    style={panelStyle}
  >
    <dl class="grid grid-cols-[auto_auto_minmax(3ch,auto)] items-baseline gap-x-1.5 gap-y-0.5">
      {#each rows as row (row.label)}
        <dt class="text-app-muted">{row.label}</dt>
        <dd class="font-mono text-app-fg">R$</dd>
        <dd class="text-right font-mono tabular-nums text-app-fg">
          {formatCurrencyCompactAmount(row.value)}
        </dd>
      {/each}
    </dl>
  </div>
{/if}
