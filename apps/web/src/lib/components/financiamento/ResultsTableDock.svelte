<script lang="ts">
  import ResultsTable from "$lib/components/financiamento/ResultsTable.svelte";
  import type { CenarioCompleto } from "$lib/financiamento/calculations";

  let {
    cenarios,
    permutaDisponivel = true,
    scenarioColorIndex,
    hiddenChartIds = new Set<string>(),
    onToggleChartVisibility
  }: {
    cenarios: CenarioCompleto[];
    permutaDisponivel?: boolean;
    scenarioColorIndex?: Map<string, number>;
    hiddenChartIds?: Set<string>;
    onToggleChartVisibility?: (cenarioId: string) => void;
  } = $props();
</script>

<section
  class="relative z-40 max-h-[min(14rem,30vh)] shrink-0 overflow-hidden border-t border-app-border bg-app-surface shadow-[0_-4px_12px_rgb(0_0_0/0.08)]"
  aria-label="Resultados dos cenários"
>
  <ResultsTable
    {cenarios}
    {permutaDisponivel}
    compact
    {scenarioColorIndex}
    {hiddenChartIds}
    {onToggleChartVisibility}
  />
</section>
