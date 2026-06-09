<script lang="ts">
  import {
    formatCurrencyCompact,
    type CenarioCompleto
  } from "$lib/financiamento/calculations";
  import { formatMonthDurationLong } from "$lib/components/financiamento/parameter-row-helpers";
  import { cn } from "$lib/utils";

  let { cenarios }: { cenarios: CenarioCompleto[] | null | undefined } = $props();

  type StatCard = {
    label: string;
    value: string;
    icon: string;
    highlight?: boolean;
    variant?: "salmon";
  };

  const statCards = $derived.by((): StatCard[] | null => {
    if (!cenarios || cenarios.length === 0) return null;

    const stats = {
      menorFinanciamento: Math.min(...cenarios.map((c) => c.financiamento.valorFinanciado)),
      maiorFinanciamento: Math.max(...cenarios.map((c) => c.financiamento.valorFinanciado)),
      menorParcela: Math.min(...cenarios.map((c) => c.tabelaPadrao.primeiraParcelar)),
      maiorParcela: Math.max(...cenarios.map((c) => c.tabelaPadrao.primeiraParcelar)),
      menorJuros: Math.min(...cenarios.map((c) => c.cenarioOtimizado.totalJuros)),
      maiorJuros: Math.max(...cenarios.map((c) => c.cenarioOtimizado.totalJuros)),
      menorPrazo: Math.min(...cenarios.map((c) => c.cenarioOtimizado.prazoReal)),
      maiorPrazo: Math.max(...cenarios.map((c) => c.cenarioOtimizado.prazoReal)),
      maiorEconomia: Math.max(...cenarios.map((c) => c.economiaJuros)),
      cenariosAprovados: cenarios.filter((c) => c.comprometimento.dentroDoLimite).length
    };

    return [
      {
        label: "Range Financiamento",
        value: `${formatCurrencyCompact(stats.menorFinanciamento)} - ${formatCurrencyCompact(stats.maiorFinanciamento)}`,
        icon: "💰"
      },
      {
        label: "Range Parcela",
        value: `${formatCurrencyCompact(stats.menorParcela)} - ${formatCurrencyCompact(stats.maiorParcela)}`,
        icon: "📊"
      },
      {
        label: "💸 Juros a Pagar",
        value: `${formatCurrencyCompact(stats.menorJuros)} - ${formatCurrencyCompact(stats.maiorJuros)}`,
        icon: "",
        variant: "salmon"
      },
      {
        label: "Range Prazo (Otim.)",
        value:
          stats.menorPrazo === stats.maiorPrazo
            ? formatMonthDurationLong(stats.menorPrazo)
            : `${formatMonthDurationLong(stats.menorPrazo)} - ${formatMonthDurationLong(stats.maiorPrazo)}`,
        icon: "⏱️"
      },
      {
        label: "💚 Maior Economia",
        value: formatCurrencyCompact(stats.maiorEconomia),
        icon: "",
        highlight: true
      },
      {
        label: "Aprovação Crédito",
        value: `${stats.cenariosAprovados}/${cenarios.length} cenários`,
        icon: stats.cenariosAprovados === cenarios.length ? "✅" : "⚠️"
      }
    ];
  });
</script>

{#if statCards}
  <div class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
    {#each statCards as card (card.label)}
      <div
        class={cn(
          "rounded-lg border border-app-border bg-app-surface-muted p-3",
          card.highlight && "border-green bg-green/5",
          card.variant === "salmon" && "border-salmon bg-salmon/5"
        )}
      >
        <div class="mb-1 flex items-center gap-2">
          {#if card.icon}
            <span class="text-lg">{card.icon}</span>
          {/if}
          <span
            class={cn("text-xs", card.variant === "salmon" ? "text-salmon" : "text-app-muted")}
          >
            {card.label}
          </span>
        </div>
        <span
          class={cn(
            "font-mono text-sm font-bold",
            card.highlight && "text-green",
            card.variant === "salmon" && "text-salmon",
            !card.highlight && card.variant !== "salmon" && "text-app-fg"
          )}
        >
          {card.value}
        </span>
      </div>
    {/each}
  </div>
{/if}
