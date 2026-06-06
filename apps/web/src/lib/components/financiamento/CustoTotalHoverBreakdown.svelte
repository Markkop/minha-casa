<script lang="ts">
  import ValueHoverBreakdown, {
    type BreakdownRow
  } from "$lib/components/financiamento/ValueHoverBreakdown.svelte";
  import type { CenarioCompleto } from "$lib/financiamento/calculations";
  import type { Snippet } from "svelte";

  let {
    cenario,
    children
  }: {
    cenario: CenarioCompleto;
    children: Snippet;
  } = $props();

  const rows = $derived(buildBreakdown(cenario));

  function buildBreakdown(c: CenarioCompleto): BreakdownRow[] {
    const breakdown: BreakdownRow[] = [
      { label: "Imóvel", value: c.valorImovel },
      { label: "Juros", value: c.cenarioOtimizado.totalJuros },
      { label: "Fechamento", value: c.custosFechamento.total }
    ];
    if (c.totalReformas > 0) breakdown.push({ label: "Reformas", value: c.totalReformas });
    if (c.totalManutencao > 0) breakdown.push({ label: "Manutenção", value: c.totalManutencao });
    if (c.custoCarregoApto > 0) breakdown.push({ label: "Carrego apto", value: c.custoCarregoApto });
    return breakdown;
  }
</script>

<ValueHoverBreakdown {rows}>
  {@render children()}
</ValueHoverBreakdown>
