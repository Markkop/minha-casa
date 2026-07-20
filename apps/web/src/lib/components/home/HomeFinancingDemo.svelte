<script lang="ts">
  import TotalBalanceTimelineChart from "$lib/components/financiamento/TotalBalanceTimelineChart.svelte";
  import {
    createChartSelectionState,
    setChartSelectionContext
  } from "$lib/components/financiamento/chart-selection-context.svelte";
  import {
    buildHomeFinancingScenario,
    clampHomeEntry
  } from "$lib/components/home/home-demo-state";

  const chartSelection = createChartSelectionState();
  setChartSelectionContext(chartSelection);

  let propertyValue = $state(500_000);
  let entryValue = $state(400_000);
  let capitalDisponivel = $state(500_000);
  let monthlyExtra = $state(10_000);
  let extraStartDelay = $state(6);

  const entryMax = $derived(Math.min(2_000_000, propertyValue));
  const scenario = $derived(
    buildHomeFinancingScenario({
      propertyValue,
      entryValue,
      capitalDisponivel,
      monthlyExtra,
      extraStartDelay
    })
  );
  const scenarios = $derived([scenario]);

  const currency = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0
  });
  const compactCurrency = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 2
  });

  function changePropertyValue(event: Event) {
    propertyValue = Number((event.currentTarget as HTMLInputElement).value);
    entryValue = clampHomeEntry(propertyValue, entryValue);
    chartSelection.clearSelection();
  }

  function changeEntry(event: Event) {
    entryValue = clampHomeEntry(propertyValue, Number((event.currentTarget as HTMLInputElement).value));
    chartSelection.clearSelection();
  }

  function changeMonthlyExtra(event: Event) {
    monthlyExtra = Number((event.currentTarget as HTMLInputElement).value);
    chartSelection.clearSelection();
  }

  function changeExtraStart(event: Event) {
    extraStartDelay = Number((event.currentTarget as HTMLInputElement).value);
    chartSelection.clearSelection();
  }

  function yearsAndMonths(months: number) {
    const years = Math.floor(months / 12);
    const remainder = months % 12;
    if (years === 0) return `${remainder} meses`;
    if (remainder === 0) return `${years} anos`;
    return `${years}a ${remainder}m`;
  }
</script>

<div class="financing-demo">
  <div class="chart-shell">
    <TotalBalanceTimelineChart
      cenarios={scenarios}
      capitalDisponivel={capitalDisponivel}
      quantiaExtra={0}
      custoMensal={0}
      breakdownAnchorSide="right"
    />
  </div>

  <div class="controls" aria-label="Parâmetros do financiamento">
    <label>
      <span class="control-head"><b>Valor do imóvel</b><output>{compactCurrency.format(propertyValue)}</output></span>
      <input type="range" min="500000" max="3000000" step="50000" value={propertyValue} oninput={changePropertyValue} />
      <span class="range"><small>R$ 500 mil</small><small>R$ 3 milhões</small></span>
    </label>
    <label>
      <span class="control-head"><b>Entrada</b><output>{compactCurrency.format(entryValue)}</output></span>
      <input type="range" min="100000" max={entryMax} step="50000" value={entryValue} oninput={changeEntry} />
      <span class="range"><small>R$ 100 mil</small><small>{compactCurrency.format(entryMax)}</small></span>
    </label>
    <label>
      <span class="control-head"><b>Aporte extra mensal</b><output>{currency.format(monthlyExtra)}</output></span>
      <input type="range" min="0" max="30000" step="1000" value={monthlyExtra} oninput={changeMonthlyExtra} />
      <span class="range"><small>Sem aporte</small><small>R$ 30 mil</small></span>
    </label>
    <label>
      <span class="control-head"><b>Início do aporte</b><output>{extraStartDelay === 0 ? "Imediato" : `${extraStartDelay} meses`}</output></span>
      <input type="range" min="0" max="24" step="1" value={extraStartDelay} oninput={changeExtraStart} />
      <span class="range"><small>Agora</small><small>24 meses</small></span>
    </label>
  </div>

  <div class="summary" aria-live="polite">
    <div><span>Valor financiado</span><b>{compactCurrency.format(scenario.financiamento.valorFinanciado)}</b></div>
    <div><span>Prazo com aportes</span><b>{yearsAndMonths(scenario.cenarioOtimizado.prazoReal)}</b></div>
    <div><span>Juros economizados</span><b>{compactCurrency.format(Math.max(0, scenario.economiaJuros))}</b></div>
  </div>
</div>

<style>
  .financing-demo { padding: 1.25rem 1.4rem 1.4rem; }
  .chart-shell { --app-bg: rgb(3 7 17 / 20%); --app-surface: rgb(5 11 26 / 30%); --app-surface-muted: rgb(12 27 58 / 55%); --app-border: rgb(96 165 250 / 13%); --app-border-strong: rgb(103 232 249 / 28%); --app-fg: #dbeafe; --app-muted: #7f9bce; --app-subtle: #4a5f8a; --app-accent: #22d3ee; --app-warning: #fb7185; --app-success: #4ade80; }
  .chart-shell :global(section), .chart-shell :global([class*="rounded"]) { box-shadow: none; }
  .controls { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.1rem 1.5rem; margin-top: 1.2rem; }
  .controls label { display: block; min-width: 0; }
  .control-head { display: flex; align-items: baseline; justify-content: space-between; gap: .75rem; margin-bottom: .55rem; }
  .control-head b { color: var(--home-ink-dim); font-size: .7rem; font-weight: 500; }
  .control-head output { color: var(--home-cyan-soft); font-family: var(--home-mono); font-size: .72rem; font-variant-numeric: tabular-nums; white-space: nowrap; }
  input[type="range"] { width: 100%; height: .25rem; appearance: none; border-radius: 999px; outline: none; background: rgb(96 165 250 / 18%); }
  input[type="range"]::-webkit-slider-thumb { width: .95rem; height: .95rem; appearance: none; border: 0; border-radius: 50%; background: var(--home-cyan); box-shadow: 0 0 .65rem rgb(34 211 238 / 90%), 0 0 0 .25rem rgb(34 211 238 / 15%); }
  input[type="range"]::-moz-range-thumb { width: .95rem; height: .95rem; border: 0; border-radius: 50%; background: var(--home-cyan); box-shadow: 0 0 .65rem rgb(34 211 238 / 90%); }
  .range { display: flex; justify-content: space-between; margin-top: .42rem; color: var(--home-ink-faint); font-family: var(--home-mono); font-size: .5rem; letter-spacing: .03em; }
  .summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .75rem; margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid rgb(96 165 250 / 14%); }
  .summary div { display: flex; min-width: 0; flex-direction: column; gap: .3rem; }
  .summary span { color: var(--home-ink-faint); font-family: var(--home-mono); font-size: .55rem; letter-spacing: .12em; text-transform: uppercase; }
  .summary b { overflow: hidden; color: #eaf2ff; font-family: var(--home-mono); font-size: .82rem; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }

  @media (max-width: 720px) {
    .financing-demo { padding: .9rem; }
    .controls { grid-template-columns: 1fr; gap: 1rem; }
    .summary { grid-template-columns: 1fr; }
    .summary div { flex-direction: row; align-items: baseline; justify-content: space-between; gap: 1rem; }
  }
</style>
