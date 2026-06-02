<script lang="ts">
  import ComparisonTooltip from "$lib/components/comparacao/ComparisonTooltip.svelte";
  import { getMatrixRowAccessibleLabel, type MatrixRow } from "$lib/comparacao/comparison-matrix";

  let {
    row,
    isMobileLayout
  }: {
    row: MatrixRow;
    isMobileLayout: boolean;
  } = $props();

  const accessibleLabel = $derived(getMatrixRowAccessibleLabel(row));
</script>

{#if !isMobileLayout}
  {#if row.labelDetail}
    <span class="inline-flex items-baseline gap-1 leading-none">
      <span class="uppercase tracking-wide">{row.label}</span>
      <span class="text-[8px] font-normal normal-case leading-none text-app-muted">
        {row.labelDetail}
      </span>
    </span>
  {:else}
    <span class="uppercase tracking-wide">{row.label}</span>
  {/if}
{:else}
  <ComparisonTooltip side="right">
    {#snippet trigger()}
      <button
        type="button"
        class="mx-auto flex flex-col items-center justify-center gap-0.5 leading-none"
        aria-label={accessibleLabel}
      >
        <row.icon class="h-4 w-4 shrink-0 text-app-muted" />
        {#if row.labelDetail}
          <span class="text-[8px] font-normal normal-case text-app-muted">
            {row.labelDetail}
          </span>
        {/if}
      </button>
    {/snippet}
    {accessibleLabel}
  </ComparisonTooltip>
{/if}
