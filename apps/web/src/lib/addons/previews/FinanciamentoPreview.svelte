<script lang="ts">
  import ResultsTable from "$lib/components/financiamento/ResultsTable.svelte";
  import { PERCENTAGE_OPTIONS } from "$lib/components/financiamento/financiamento-parameter-types";
  import Slider from "$lib/components/ui/Slider.svelte";
  import { formatCurrency, gerarMatrizCenarios } from "$lib/financiamento/calculations";
  import { DEMO_DEFAULTS } from "$lib/components/home/demo-financiamento/demo-financiamento-types";

  /** Same chips as /financeiro (Original, -5%, -10%, -15%) — always on, no toolbar in preview. */
  const PREVIEW_IMOVEL_MULTIPLIERS = PERCENTAGE_OPTIONS.slice(0, 4).map((option) => option.value);

  const IMOVEL_MIN = 400_000;
  const IMOVEL_MAX = 2_500_000;
  const IMOVEL_STEP = 50_000;
  const CAPITAL_MIN = 0;
  const CAPITAL_MAX = 1_200_000;
  const CAPITAL_STEP = 25_000;
  const TAXA_MIN = 8;
  const TAXA_MAX = 14;
  const TAXA_STEP = 0.1;

  let valorImovel = $state(900_000);
  let capitalDisponivel = $state(250_000);
  let taxaAnualPercent = $state(10.5);

  const taxaAnual = $derived(taxaAnualPercent / 100);

  const valoresImovel = $derived(
    Array.from(
      new Set(PREVIEW_IMOVEL_MULTIPLIERS.map((multiplier) => Math.round(valorImovel * multiplier)))
    )
  );

  const valorImovelDiscountLabels = $derived(
    Object.fromEntries(
      PERCENTAGE_OPTIONS.slice(0, 4)
        .filter((option) => option.label !== "Original")
        .map((option) => [Math.round(valorImovel * option.value), option.label])
    )
  );

  const cenarios = $derived(
    gerarMatrizCenarios({
      valoresImovel,
      valoresApartamento: [0],
      capitalDisponivel,
      reservaEmergencia: 0,
      haircut: DEMO_DEFAULTS.haircut,
      taxaAnual,
      trMensal: DEMO_DEFAULTS.trMensal,
      prazoMeses: DEMO_DEFAULTS.prazoMeses,
      aporteExtra: DEMO_DEFAULTS.aporteExtra,
      rendaMensal: DEMO_DEFAULTS.rendaMensal,
      custoCondominioMensal: DEMO_DEFAULTS.custoCondominioMensal,
      seguros: DEMO_DEFAULTS.seguros
    })
  );
</script>

<div class="flex aspect-video min-h-[200px] flex-col border-t border-app-border bg-app-surface">
  <div class="grid shrink-0 grid-cols-3 gap-2 border-b border-app-border p-3">
    <label class="space-y-1">
      <div class="flex items-center justify-between gap-1 text-[10px]">
        <span class="text-app-muted">Imóvel</span>
        <span class="font-mono tabular-nums text-app-fg">{formatCurrency(valorImovel)}</span>
      </div>
      <Slider
        bind:value={valorImovel}
        min={IMOVEL_MIN}
        max={IMOVEL_MAX}
        step={IMOVEL_STEP}
        ariaLabel="Preço do imóvel"
      />
    </label>
    <label class="space-y-1">
      <div class="flex items-center justify-between gap-1 text-[10px]">
        <span class="text-app-muted">Capital</span>
        <span class="font-mono tabular-nums text-app-fg">{formatCurrency(capitalDisponivel)}</span>
      </div>
      <Slider
        bind:value={capitalDisponivel}
        min={CAPITAL_MIN}
        max={CAPITAL_MAX}
        step={CAPITAL_STEP}
        ariaLabel="Capital disponível"
      />
    </label>
    <label class="space-y-1">
      <div class="flex items-center justify-between gap-1 text-[10px]">
        <span class="text-app-muted">Taxa a.a.</span>
        <span class="font-mono tabular-nums text-app-fg">{taxaAnualPercent.toFixed(1)}%</span>
      </div>
      <Slider
        bind:value={taxaAnualPercent}
        min={TAXA_MIN}
        max={TAXA_MAX}
        step={TAXA_STEP}
        ariaLabel="Taxa de juros anual"
      />
    </label>
  </div>

  <div class="min-h-0 flex-1 overflow-auto p-1">
    <ResultsTable
      {cenarios}
      permutaDisponivel={false}
      compact
      hideVisibilityColumn
      hideCustoTotalColumn
      {valorImovelDiscountLabels}
    />
  </div>
</div>
