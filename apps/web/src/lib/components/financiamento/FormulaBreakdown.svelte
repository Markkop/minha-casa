<script lang="ts">
  import { ChevronDown, ChevronUp } from "@lucide/svelte";
  import FormulaSection from "$lib/components/financiamento/FormulaSection.svelte";
  import KatexMath from "$lib/components/financiamento/KatexMath.svelte";
  import { buildFormulaSections } from "$lib/components/financiamento/formula-breakdown-data";
  import Card from "$lib/components/ui/Card.svelte";
  import CardContent from "$lib/components/ui/CardContent.svelte";
  import CardHeader from "$lib/components/ui/CardHeader.svelte";
  import CardTitle from "$lib/components/ui/CardTitle.svelte";
  import type { CenarioCompleto } from "$lib/financiamento/calculations";

  let { cenario }: { cenario: CenarioCompleto } = $props();

  let isCollapsed = $state(false);

  const sections = $derived(buildFormulaSections(cenario));
</script>

{#if isCollapsed}
  <Card class="border-app-border bg-app-surface-muted">
    <button
      type="button"
      class="flex w-full items-center justify-between rounded-lg p-4 transition-colors hover:bg-app-action-hover/5"
      onclick={() => (isCollapsed = false)}
    >
      <div class="flex items-center gap-2">
        <span class="text-lg">📐</span>
        <span class="text-sm font-semibold text-app-muted">Fórmulas e Cálculos</span>
      </div>
      <ChevronDown class="size-5 text-app-subtle" />
    </button>
  </Card>
{:else}
  <Card class="border-app-border bg-app-surface-muted">
    <CardHeader class="pb-2">
      <div class="flex items-center justify-between">
        <CardTitle class="flex items-center gap-2 text-base">
          <span>📐</span>
          Fórmulas e Cálculos
        </CardTitle>
        <button
          type="button"
          class="flex items-center gap-1 text-xs text-app-subtle transition-colors hover:text-app-accent"
          onclick={() => (isCollapsed = true)}
        >
          Minimizar
          <ChevronUp class="size-4" />
        </button>
      </div>
      <p class="mt-1 text-xs text-app-subtle">Matemática por trás do cenário selecionado</p>
    </CardHeader>

    <CardContent class="space-y-4">
      <FormulaSection title="Valor Financiado" {...sections.valorFinanciadoFormula} initialExpanded />
      <FormulaSection title="Taxa Mensal Efetiva" {...sections.taxaFormula} initialExpanded={false} />
      <FormulaSection title="Parcela SAC (1ª Parcela)" {...sections.parcelaSACFormula} initialExpanded={false} />
      <FormulaSection
        title="Comprometimento de Renda"
        {...sections.comprometimentoFormula}
        initialExpanded={false}
      />
      <FormulaSection title="Economia de Juros" {...sections.economiaFormula} initialExpanded={false} />

      <div class="space-y-1 border-t border-app-border pt-4 text-xs text-app-subtle">
        <p class="font-semibold text-app-muted">Legenda:</p>
        <div class="grid grid-cols-2 gap-x-4 gap-y-1">
          <span><KatexMath math="V_f" /> = Valor Financiado</span>
          <span><KatexMath math="I" /> = Valor do Imóvel</span>
          <span><KatexMath math="C" /> = Capital Disponível</span>
          <span><KatexMath math="R" /> = Reserva Emergência</span>
          <span><KatexMath math="A" /> = Valor do Apartamento</span>
          <span><KatexMath math="h" /> = Haircut (deságio)</span>
          <span><KatexMath math="i" /> = Taxa Mensal</span>
          <span><KatexMath math="P" /> = Parcela</span>
          <span><KatexMath math="S" /> = Saldo Devedor</span>
          <span><KatexMath math="J" /> = Juros</span>
        </div>
      </div>
    </CardContent>
  </Card>
{/if}
