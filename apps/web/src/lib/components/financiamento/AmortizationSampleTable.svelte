<script lang="ts">
  import {
    formatCurrency,
    type ParcelaDetalhe
  } from "$lib/financiamento/calculations";
  import { cn } from "$lib/utils";

  let { parcelas }: { parcelas: ParcelaDetalhe[] | null | undefined } = $props();

  const thClass =
    "sticky top-0 z-10 border-b border-app-border bg-app-surface px-3 py-2 text-left text-xs font-medium text-app-muted";
  const tdClass = "border-b border-app-border px-3 py-2 font-mono text-sm";
</script>

{#if parcelas && parcelas.length > 0}
  <div class="max-h-[min(50vh,24rem)] overflow-auto">
    <table class="w-full border-collapse text-sm">
      <thead>
        <tr>
          <th class={thClass}>Mês</th>
          <th class={thClass}>Saldo Devedor</th>
          <th class={thClass}>Amortização</th>
          <th class={thClass}>Juros</th>
          <th class={thClass}>Prestação</th>
        </tr>
      </thead>
      <tbody>
        {#each parcelas as parcela (parcela.mes)}
          <tr>
            <td class={tdClass}>{parcela.mes}</td>
            <td class={tdClass}>{formatCurrency(parcela.saldoDevedor)}</td>
            <td class={cn(tdClass, "text-app-accent")}>{formatCurrency(parcela.amortizacao)}</td>
            <td class={cn(tdClass, "text-salmon")}>{formatCurrency(parcela.juros)}</td>
            <td class={cn(tdClass, "font-bold")}>{formatCurrency(parcela.prestacao)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
