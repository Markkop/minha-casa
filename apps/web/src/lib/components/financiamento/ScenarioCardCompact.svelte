<script lang="ts">
  import { CircleCheck } from "@lucide/svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import ComprometimentoIndicator from "$lib/components/financiamento/ComprometimentoIndicator.svelte";
  import EstrategiaBadge from "$lib/components/financiamento/EstrategiaBadge.svelte";
  import {
    formatCurrencyCompact,
    type CenarioCompleto
  } from "$lib/financiamento/calculations";
  import { cn } from "$lib/utils";

  let {
    cenario,
    onclick
  }: {
    cenario: CenarioCompleto;
    onclick?: () => void;
  } = $props();
</script>

<Card
  class={cn(
    "cursor-pointer border-app-border bg-app-surface-muted transition-all hover:scale-[1.02] hover:border-app-action/50",
    cenario.isBest && "border-app-action ring-1 ring-primary/30"
  )}
>
  <button type="button" class="w-full p-4 text-left" {onclick}>
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-sm font-bold text-app-accent">
            {formatCurrencyCompact(cenario.valorImovel)}
          </span>
          <EstrategiaBadge estrategia={cenario.estrategia} />
        </div>
        {#if cenario.isBest}
          <CircleCheck class="size-5 text-app-accent" aria-label="Melhor cenário" />
        {/if}
      </div>

      <div class="text-xs text-app-muted">
        Apto:
        <span class="font-mono text-salmon">
          {formatCurrencyCompact(cenario.valorApartamento)}
        </span>
      </div>

      <div class="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span class="block text-app-subtle">Financiado</span>
          <span class="font-mono text-app-fg">
            {formatCurrencyCompact(cenario.financiamento.valorFinanciado)}
          </span>
        </div>
        <div>
          <span class="block text-app-subtle">1ª Parcela</span>
          <span class="font-mono text-app-fg">
            {formatCurrencyCompact(cenario.tabelaPadrao.primeiraParcelar)}
          </span>
        </div>
        <div>
          <span class="block text-app-subtle">Prazo Otim.</span>
          <span class="font-mono text-app-accent">
            {(cenario.cenarioOtimizado.prazoReal / 12).toFixed(1)} anos
          </span>
        </div>
        <div>
          <span class="block text-app-subtle">Total Pago</span>
          <span class="font-mono text-app-fg">
            {formatCurrencyCompact(cenario.cenarioOtimizado.totalPago)}
          </span>
        </div>
      </div>

      <div
        class="flex items-center justify-between rounded-md bg-app-action/10 px-2 py-1 text-xs"
      >
        <span class="text-app-accent">📈 Aporte Extra/mês</span>
        <span class="font-mono font-bold text-app-accent">
          +{formatCurrencyCompact(cenario.aporteExtra)}
        </span>
      </div>

      <div class="space-y-1 rounded-md bg-app-surface p-2">
        <div class="flex items-center justify-between">
          <span class="text-xs text-salmon">💸 Juros a Pagar</span>
          <span class="font-mono text-sm font-bold text-salmon">
            {formatCurrencyCompact(cenario.cenarioOtimizado.totalJuros)}
          </span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-xs text-green">💚 Economia vs 30 anos</span>
          <span class="font-mono text-sm font-bold text-green">
            {formatCurrencyCompact(cenario.economiaJuros)}
          </span>
        </div>
      </div>

      <ComprometimentoIndicator comprometimento={cenario.comprometimento} />
    </div>
  </button>
</Card>
