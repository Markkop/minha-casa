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
    if ((c.totalCustosAdicionais ?? 0) > 0) {
      breakdown.push({ label: "Outros", value: c.totalCustosAdicionais ?? 0 });
    }
    if (c.custoCarregoApto > 0) {
      breakdown.push({ label: "Carrego apto", value: c.custoCarregoApto });
    } else if (c.totalManutencao > 0) {
      breakdown.push({ label: "Manutenção", value: c.totalManutencao });
    }
    return breakdown;
  }
</script>

<ValueHoverBreakdown {rows}>
  {@render children()}
</ValueHoverBreakdown>
