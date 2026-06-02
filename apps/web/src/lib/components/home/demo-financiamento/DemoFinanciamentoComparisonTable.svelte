<script lang="ts">
  import { ArrowDown, ArrowUp } from "@lucide/svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import CardContent from "$lib/components/ui/CardContent.svelte";
  import CardHeader from "$lib/components/ui/CardHeader.svelte";
  import CardTitle from "$lib/components/ui/CardTitle.svelte";
  import { formatCurrencyCompact, type CenarioCompleto } from "$lib/financiamento/calculations";
  import { cn } from "$lib/utils";
  import {
    formatCurrencyK,
    type SortKey,
    type SortState
  } from "$lib/components/home/demo-financiamento/demo-financiamento-types";

  let {
    sortedCenarios,
    sort,
    onSort
  }: {
    sortedCenarios: CenarioCompleto[];
    sort: SortState;
    onSort: (key: SortKey) => void;
  } = $props();
</script>

{#snippet sortableHeader(
  label: string,
  sortKey: SortKey,
  align: "left" | "right" = "left"
)}
  {@const isActive = sort.key === sortKey}
  {@const isAsc = isActive && sort.direction === "asc"}
  <th
    class={cn(
      "cursor-pointer px-3 py-2 text-xs font-medium text-app-muted transition-colors hover:bg-app-surface-muted",
      align === "right" ? "text-right" : "text-left"
    )}
    onclick={() => onSort(sortKey)}
  >
    <div class={cn("flex items-center gap-1", align === "right" && "justify-end")}>
      <span>{label}</span>
      {#if isActive}
        {#if isAsc}
          <ArrowUp class="h-3 w-3 text-app-fg" />
        {:else}
          <ArrowDown class="h-3 w-3 text-app-fg" />
        {/if}
      {/if}
    </div>
  </th>
{/snippet}

<Card class="border-app-border bg-app-surface">
  <CardHeader class="px-4 pb-2 pt-4">
    <CardTitle class="text-sm">Tabela Comparativa</CardTitle>
  </CardHeader>
  <CardContent class="p-0">
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-app-border bg-app-bg">
            <th class="w-8 px-2 py-2"></th>
            {@render sortableHeader("Alvo", "valorImovel")}
            {@render sortableHeader("Apto", "valorApartamento")}
            <th class="px-3 py-2 text-left text-xs font-medium text-app-muted">Estratégia</th>
            {@render sortableHeader("Financiado", "valorFinanciado", "right")}
            {@render sortableHeader("Total/mês", "totalMes", "right")}
            {@render sortableHeader("Prazo", "prazoReal", "right")}
            {@render sortableHeader("Juros", "jurosOtimizado", "right")}
            {@render sortableHeader("Custo Total", "custoTotal", "right")}
          </tr>
        </thead>
        <tbody>
          {#each sortedCenarios.slice(0, 12) as c (c.id)}
            <tr
              class={cn(
                "border-b border-app-border transition-colors hover:bg-app-bg",
                c.isBest && "bg-app-action/20"
              )}
            >
              <td class="w-8 px-2 py-2 text-center">
                {#if c.isBest}
                  <span class="text-app-accent">✓</span>
                {/if}
              </td>
              <td class="whitespace-nowrap px-3 py-2 font-mono text-app-fg">
                {formatCurrencyCompact(c.valorImovel)}
              </td>
              <td class="whitespace-nowrap px-3 py-2 font-mono text-rose-700">
                {formatCurrencyCompact(
                  c.estrategia === "permuta"
                    ? c.financiamento.valorApartamentoUsado
                    : c.valorApartamento
                )}
              </td>
              <td class="px-3 py-2">
                <span
                  class={cn(
                    "rounded border px-2 py-0.5 text-xs",
                    c.estrategia === "permuta"
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  )}
                >
                  {#if c.estrategia === "permuta"}
                    Permuta
                  {:else}
                    <span class="md:hidden">Posterior</span>
                    <span class="hidden md:inline">Venda Posterior</span>
                  {/if}
                </span>
              </td>
              <td class="whitespace-nowrap px-3 py-2 text-right font-mono">
                {formatCurrencyCompact(c.financiamento.valorFinanciado)}
              </td>
              <td
                class="whitespace-nowrap px-3 py-2 text-right font-mono text-sm font-bold text-app-fg"
              >
                {formatCurrencyK(c.aporteExtra + c.tabelaPadrao.primeiraParcelar)}
              </td>
              <td class="px-3 py-2 text-right font-mono text-sm text-app-fg">
                {(c.cenarioOtimizado.prazoReal / 12) % 1 === 0
                  ? `${Math.round(c.cenarioOtimizado.prazoReal / 12)}a`
                  : `${(c.cenarioOtimizado.prazoReal / 12).toFixed(1)}a`}
              </td>
              <td
                class="whitespace-nowrap px-3 py-2 text-right font-mono text-sm font-bold text-rose-700"
              >
                {formatCurrencyK(c.cenarioOtimizado.totalJuros)}
              </td>
              <td class="whitespace-nowrap px-3 py-2 text-right font-mono">
                {formatCurrencyCompact(c.custoTotalOtimizado)}
              </td>
            </tr>
          {/each}
          {#if sortedCenarios.length === 0}
            <tr>
              <td colspan={9} class="px-3 py-8 text-center text-app-muted">
                Selecione pelo menos um filtro e uma estratégia
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  </CardContent>
</Card>
