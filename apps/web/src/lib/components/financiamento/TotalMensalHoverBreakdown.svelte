<script lang="ts">
  import ValueHoverBreakdown, {
    type BreakdownRow
  } from "$lib/components/financiamento/ValueHoverBreakdown.svelte";
  import type { TimelineMonth } from "$lib/financiamento/financing-timeline";
  import type { Snippet } from "svelte";

  let {
    month,
    children
  }: {
    month: TimelineMonth | undefined;
    children: Snippet;
  } = $props();

  const rows = $derived(buildBreakdown(month));

  function buildBreakdown(m: TimelineMonth | undefined): BreakdownRow[] {
    if (!m) return [];
    const breakdown: BreakdownRow[] = [{ label: "Prestação", value: m.prestacao }];
    if (m.aporteExtra > 0) breakdown.push({ label: "Aporte extra", value: m.aporteExtra });
    if (m.reformaInicial + m.reformaMensal > 0) {
      breakdown.push({ label: "Reformas", value: m.reformaInicial + m.reformaMensal });
    }
    if ((m.custosAdicionais ?? 0) > 0) {
      breakdown.push({ label: "Outros", value: m.custosAdicionais ?? 0 });
    }
    if (m.manutencaoMensal > 0) breakdown.push({ label: "Manutenção", value: m.manutencaoMensal });
    return breakdown;
  }
</script>

<ValueHoverBreakdown {rows}>
  {@render children()}
</ValueHoverBreakdown>
