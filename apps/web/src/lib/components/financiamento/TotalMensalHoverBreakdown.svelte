<script lang="ts">
  import { onDestroy, tick, type Snippet } from "svelte";
  import { TOOLTIP_SURFACE_FLOATING_CLASS } from "$lib/components/ui/tooltip-content";
  import { formatCurrencyCompact } from "$lib/financiamento/calculations";
  import type { TimelineMonth } from "$lib/financiamento/financing-timeline";
  import { computeTooltipPlacement } from "$lib/floating-position";
  import { cn } from "$lib/utils";

  let { month, children }: { month: TimelineMonth | undefined; children: Snippet } = $props();

  interface BreakdownRow {
    label: string;
    value: number;
  }

  const breakdown = $derived(buildBreakdown(month));
  const hasBreakdown = $derived(breakdown.length > 0);

  function buildBreakdown(m: TimelineMonth | undefined): BreakdownRow[] {
    if (!m) return [];
    const rows: BreakdownRow[] = [{ label: "Prestação", value: m.prestacao }];
    if (m.aporteExtra > 0) rows.push({ label: "Aporte extra", value: m.aporteExtra });
    if (m.reformaMensal > 0) rows.push({ label: "Reformas", value: m.reformaMensal });
    if (m.manutencaoMensal > 0) rows.push({ label: "Manutenção", value: m.manutencaoMensal });
    return rows;
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
    <dl class="grid grid-cols-[auto_auto] gap-x-2 gap-y-0.5">
      {#each breakdown as row (row.label)}
        <dt class="text-app-muted">{row.label}</dt>
        <dd class="text-right font-mono text-app-fg">{formatCurrencyCompact(row.value)}</dd>
      {/each}
    </dl>
  </div>
{/if}
