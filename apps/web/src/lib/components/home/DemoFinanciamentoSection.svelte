<script lang="ts">
  import Card from "$lib/components/ui/Card.svelte";
  import CardContent from "$lib/components/ui/CardContent.svelte";
  import { gerarMatrizCenarios, type CenarioCompleto } from "$lib/financiamento/calculations";
  import DemoFinanciamentoInputs from "$lib/components/home/demo-financiamento/DemoFinanciamentoInputs.svelte";
  import DemoFinanciamentoScenarioFilters from "$lib/components/home/demo-financiamento/DemoFinanciamentoScenarioFilters.svelte";
  import DemoFinanciamentoComparisonTable from "$lib/components/home/demo-financiamento/DemoFinanciamentoComparisonTable.svelte";
  import {
    DEMO_DEFAULTS,
    type Estrategia,
    type SortKey,
    type SortState
  } from "$lib/components/home/demo-financiamento/demo-financiamento-types";

  let valorImovel = $state(DEMO_DEFAULTS.valorImovel);
  let taxaAnual = $state(DEMO_DEFAULTS.taxaAnual);
  let trMensal = $state(DEMO_DEFAULTS.trMensal);
  let capitalDisponivel = $state(DEMO_DEFAULTS.capitalDisponivel);
  let valorApartamento = $state(DEMO_DEFAULTS.valorApartamento);
  let aporteExtra = $state(DEMO_DEFAULTS.aporteExtra);
  let imovelMultipliers = $state<number[]>([1.0]);
  let aptoMultipliers = $state<number[]>([1.0]);
  let estrategias = $state<Estrategia[]>(["permuta", "venda_posterior"]);
  let sort = $state<SortState>({ key: "jurosOtimizado", direction: "asc" });

  function handleSort(key: SortKey) {
    sort = {
      key,
      direction: sort.key === key && sort.direction === "desc" ? "asc" : "desc"
    };
  }

  const cenarios = $derived.by(() => {
    const valoresImovel = imovelMultipliers.map((m) => Math.round(valorImovel * m));
    const valoresApto = aptoMultipliers.map((m) => Math.round(valorApartamento * m));

    return gerarMatrizCenarios({
      valoresImovel,
      valoresApartamento: valoresApto,
      capitalDisponivel,
      reservaEmergencia: 0,
      haircut: DEMO_DEFAULTS.haircut,
      taxaAnual,
      trMensal,
      prazoMeses: DEMO_DEFAULTS.prazoMeses,
      aporteExtra,
      rendaMensal: DEMO_DEFAULTS.rendaMensal,
      custoManutencaoImovelMensal: DEMO_DEFAULTS.custoCondominioMensal,
      temImovelParaNegociar: true,
      temposVendaPosteriorMeses: [6],
      seguros: DEMO_DEFAULTS.seguros
    }).filter((c) => estrategias.includes(c.estrategia));
  });

  const sortedCenarios = $derived.by(() => {
    return [...cenarios].sort((a, b) => {
      const getValue = (cenario: CenarioCompleto, key: SortKey): number => {
        const paths: Record<SortKey, number> = {
          valorImovel: cenario.valorImovel,
          valorApartamento: cenario.valorApartamento,
          valorFinanciado: cenario.financiamento.valorFinanciado,
          totalMes: cenario.aporteExtra + cenario.tabelaPadrao.primeiraParcelar,
          comprometimento: cenario.comprometimento.percentual,
          prazoReal: cenario.cenarioOtimizado.prazoReal,
          jurosOtimizado: cenario.cenarioOtimizado.totalJuros,
          custoTotal: cenario.custoTotalOtimizado
        };
        return paths[key] ?? 0;
      };

      const aVal = getValue(a, sort.key);
      const bVal = getValue(b, sort.key);
      return sort.direction === "asc" ? aVal - bVal : bVal - aVal;
    });
  });
</script>

<section class="mt-16 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
  <div
    class="flex flex-col justify-between gap-4 border-b border-app-border pb-4 md:flex-row md:items-center"
  >
    <div>
      <h2 class="flex items-center gap-2 text-2xl font-bold text-app-fg">
        <span>🏠</span>
        <span>Financeiro</span>
        <span
          class="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800"
        >
          <span>🚀</span>
          Em Breve
        </span>
      </h2>
      <p class="text-sm text-app-muted">
        Planejamento da compra com cenários de financiamento, permuta e venda.
      </p>
    </div>
  </div>

  <Card class="border-app-border bg-app-surface">
    <CardContent class="px-4 pb-4 pt-4">
      <div class="space-y-6">
        <DemoFinanciamentoInputs
          bind:valorImovel
          bind:taxaAnual
          bind:trMensal
          bind:capitalDisponivel
          bind:valorApartamento
          bind:aporteExtra
        />
        <DemoFinanciamentoScenarioFilters
          {valorImovel}
          {valorApartamento}
          bind:imovelMultipliers
          bind:aptoMultipliers
          bind:estrategias
        />
      </div>
    </CardContent>
  </Card>

  <DemoFinanciamentoComparisonTable {sortedCenarios} {sort} onSort={handleSort} />
</section>
