<script lang="ts">
  import {
    buildMonthGridTicks,
    buildXAxisLabelTicks,
    CHART_HEIGHT,
    CHART_PADDING,
    monthPitch,
    prePurchaseReferenceLineX,
    svgCoordsToLocal,
    svgPlotBoundsToLocal,
    svgPointFromPointer,
    type ChartHover
  } from "$lib/components/financiamento/debt-timeline-chart-math";
  import ChartLegend from "$lib/components/financiamento/charts/ChartLegend.svelte";
  import ChartHoverBreakdownPanel from "$lib/components/financiamento/ChartHoverBreakdownPanel.svelte";
  import CollapsibleChartPanel from "$lib/components/financiamento/charts/CollapsibleChartPanel.svelte";
  import ScenarioChartMarkers from "$lib/components/financiamento/charts/ScenarioChartMarkers.svelte";
  import TimelineChartAxes from "$lib/components/financiamento/charts/TimelineChartAxes.svelte";
  import TimelineFocusLayer from "$lib/components/financiamento/charts/TimelineFocusLayer.svelte";
  import {
    chartColor,
    scenarioLabel,
    scenarioLegendEntries
  } from "$lib/components/financiamento/charts/chart-shared";
  import { useResponsiveChartWidth } from "$lib/components/financiamento/charts/use-responsive-chart-width.svelte";
  import {
    hoverMatchesLedgerSelection,
    isChartPointerClick,
    mesFromLedgerHover,
    resolveLedgerSelection
  } from "$lib/components/financiamento/chart-selection";
  import { getChartSelectionContext } from "$lib/components/financiamento/chart-selection-context.svelte";
  import {
    buildBalanceLedgers,
    buildSignedYAxisScale,
    ledgerYAxisValues,
    pickLedgerHover,
    polylinePointsForLedger,
    xForLedgerMonth,
    yForLedgerValue
  } from "$lib/components/financiamento/total-balance-ledger";
  import { formatTimingMonthLabelLong } from "$lib/components/financiamento/parameter-row-helpers";
  import {
    formatCurrency,
    formatCurrencyCompact,
    type CenarioCompleto
  } from "$lib/financiamento/calculations";
  import { cn } from "$lib/utils";

  let {
    cenarios,
    capitalDisponivel,
    quantiaExtra,
    custoMensal = 0
  }: {
    cenarios: CenarioCompleto[];
    capitalDisponivel: number;
    quantiaExtra: number;
    custoMensal?: number;
  } = $props();

  const padding = CHART_PADDING;
  const height = CHART_HEIGHT;
  const legendNote =
    "Saldo disponível após entrada, fechamento, renda e despesas · clique para selecionar ou desselecionar · linha horizontal tracejada: saldo zero · linhas verticais tracejadas: venda · círculo no topo: quantia extra";
  const ledgers = $derived(
    buildBalanceLedgers(cenarios, capitalDisponivel, quantiaExtra, custoMensal)
  );
  const maxMonth = $derived(
    Math.max(1, ...ledgers.flatMap((series) => series.points.map((point) => point.mes)))
  );
  const yAxis = $derived(buildSignedYAxisScale(ledgerYAxisValues(ledgers)));

  let chartContainer = $state<HTMLDivElement | null>(null);
  let svgEl = $state<SVGSVGElement | null>(null);
  let hover = $state<ChartHover | null>(null);
  let pointerDown = $state<{ x: number; y: number } | null>(null);
  const chartSize = useResponsiveChartWidth(() => chartContainer);
  const chartWidth = $derived(chartSize.chartWidth);
  const plotWidth = $derived(chartWidth - padding.left - padding.right);
  const plotHeight = $derived(height - padding.top - padding.bottom);

  const chartSelection = getChartSelectionContext();

  const hoveredPoint = $derived.by(() => {
    if (!hover) return null;
    const series = ledgers.find((item) => item.cenario.id === hover?.cenarioId);
    const point = series?.points[hover.monthIndex];
    return series && point ? { series, point } : null;
  });

  const selectedPoint = $derived.by(() => {
    if (!chartSelection.selection) return null;
    return resolveLedgerSelection(chartSelection.selection, ledgers);
  });

  const focusPoint = $derived(selectedPoint ?? hoveredPoint);
  const isSelectionPinned = $derived(!!selectedPoint);
  const breakdownPoint = $derived(
    isSelectionPinned && !chartSelection.breakdownDismissed ? selectedPoint : hoveredPoint
  );
  const isHoveringSelectedPoint = $derived(
    !!hover &&
      !!chartSelection.selection &&
      hoverMatchesLedgerSelection(hover, chartSelection.selection, ledgers)
  );
  const activeCenarioId = $derived(chartSelection.selection?.cenarioId ?? hover?.cenarioId ?? null);
  const showBreakdownPanel = $derived(
    (isSelectionPinned && !chartSelection.breakdownDismissed) ||
      (isSelectionPinned && chartSelection.breakdownDismissed && isHoveringSelectedPoint) ||
      (!isSelectionPinned && !!hoveredPoint)
  );
  const breakdownDismissable = $derived(isSelectionPinned && !chartSelection.breakdownDismissed);

  const focusX = $derived(
    focusPoint
      ? xForLedgerMonth(focusPoint.point.mes, maxMonth, chartWidth, padding)
      : null
  );

  const breakdownX = $derived(
    breakdownPoint
      ? xForLedgerMonth(breakdownPoint.point.mes, maxMonth, chartWidth, padding)
      : null
  );

  const breakdownY = $derived(
    breakdownPoint
      ? yForLedgerValue(breakdownPoint.point.saldo, yAxis, height, padding)
      : null
  );

  const columnPitch = $derived(monthPitch(plotWidth, maxMonth));

  const breakdownChartBounds = $derived.by(() => {
    if (!svgEl) return null;
    return svgPlotBoundsToLocal(svgEl, chartWidth, height, padding);
  });

  const avoidPoints = $derived.by(() => {
    if (!showBreakdownPanel || !svgEl || breakdownX === null || breakdownY === null) return [];
    return [svgCoordsToLocal(svgEl, breakdownX, breakdownY, chartWidth, height)];
  });

  const zeroY = $derived(yForLedgerValue(0, yAxis, height, padding));
  const xMonthGrid = $derived(buildMonthGridTicks(maxMonth, chartWidth, padding));
  const prePurchaseX = $derived(prePurchaseReferenceLineX(maxMonth, chartWidth, padding));
  const xLabelTicks = $derived(
    buildXAxisLabelTicks(maxMonth, chartWidth, formatTimingMonthLabelLong, padding).map((tick) => ({
      ...tick,
      x: xForLedgerMonth(tick.month, maxMonth, chartWidth, padding),
      textAnchor: tick.month === 0 ? "start" as const : "middle" as const
    }))
  );
  const yTicks = $derived(
    yAxis.ticks.map((value) => ({
      key: value,
      value,
      label: formatCurrencyCompact(value),
      emphasized: value === 0,
      y: yForLedgerValue(value, yAxis, height, padding)
    }))
  );
  const referenceLines = $derived(yAxis.ticks.includes(0) ? [] : [{ id: "zero", y: zeroY }]);

  const focusDots = $derived.by(() => {
    if (!focusPoint) return [];
    return ledgers.flatMap((other, index) => {
      const point = other.points.find((item) => item.mes === focusPoint.point.mes);
      if (!point) return [];
      return [
        {
          id: other.cenario.id,
          x: xForLedgerMonth(point.mes, maxMonth, chartWidth, padding),
          y: yForLedgerValue(point.saldo, yAxis, height, padding),
          color: chartColor(index),
          active: other.cenario.id === focusPoint.series.cenario.id
        }
      ];
    });
  });

  const legendEntries = $derived(scenarioLegendEntries(cenarios));

  function handleChartPointerMove(event: PointerEvent) {
    if (!svgEl) return;
    if (chartSelection.selection && !chartSelection.breakdownDismissed) {
      hover = null;
      return;
    }
    const { x, y } = svgPointFromPointer(svgEl, event, chartWidth, height);
    const next = pickLedgerHover(ledgers, x, y, maxMonth, yAxis, chartWidth, hover);
    if (chartSelection.selection && chartSelection.breakdownDismissed) {
      hover =
        next && hoverMatchesLedgerSelection(next, chartSelection.selection, ledgers) ? next : null;
      return;
    }
    hover = next;
  }

  function handleChartPointerDown(event: PointerEvent) {
    pointerDown = { x: event.clientX, y: event.clientY };
  }

  function handleChartPointerUp(event: PointerEvent) {
    if (!svgEl || !isChartPointerClick(pointerDown, event)) {
      pointerDown = null;
      return;
    }
    pointerDown = null;
    const { x, y } = svgPointFromPointer(svgEl, event, chartWidth, height);
    const pick = pickLedgerHover(ledgers, x, y, maxMonth, yAxis, chartWidth, hover);
    if (!pick) return;
    chartSelection.toggleSelection({
      mes: mesFromLedgerHover(pick, ledgers),
      cenarioId: pick.cenarioId
    });
  }

  function handleChartPointerLeave() {
    pointerDown = null;
    hover = null;
  }

  function markerX(month: number | undefined): number | null {
    return month === undefined
      ? null
      : xForLedgerMonth(month, maxMonth, chartWidth, padding);
  }
</script>

<CollapsibleChartPanel title="Saldo total ao longo do tempo" empty={cenarios.length === 0}>
  <div bind:this={chartContainer} class="relative w-full">
    <svg
      bind:this={svgEl}
      viewBox="0 0 {chartWidth} {height}"
      class="h-auto w-full select-none touch-none"
      role="img"
      aria-label="Gráfico de saldo total disponível por cenário"
    >
      <TimelineChartAxes
        {yTicks}
        {xMonthGrid}
        {xLabelTicks}
        {prePurchaseX}
        {chartWidth}
        {height}
        {padding}
        {referenceLines}
      />

      <g class="pointer-events-none">
        {#each ledgers as series, i (series.cenario.id)}
          {@const color = chartColor(i)}
          {@const isActive = activeCenarioId === series.cenario.id}
          <polyline
            fill="none"
            stroke={color}
            stroke-width={isActive ? 2.5 : 2}
            stroke-linejoin="round"
            stroke-linecap="round"
            points={polylinePointsForLedger(series, maxMonth, yAxis, chartWidth)}
            opacity={activeCenarioId && !isActive ? 0.3 : 1}
          />
          <ScenarioChartMarkers
            cenario={series.cenario}
            {color}
            {markerX}
            {padding}
            {height}
            showReformMarker={false}
          />
        {/each}
      </g>

      <rect
        x={padding.left}
        y={padding.top}
        width={plotWidth}
        height={plotHeight}
        fill="transparent"
        class="cursor-crosshair"
        aria-hidden="true"
        onpointerdown={handleChartPointerDown}
        onpointermove={handleChartPointerMove}
        onpointerup={handleChartPointerUp}
        onpointerleave={handleChartPointerLeave}
      />

      <TimelineFocusLayer
        {focusX}
        dots={focusDots}
        {isSelectionPinned}
        {columnPitch}
        {padding}
        {plotHeight}
        {height}
        onDismiss={() => chartSelection.clearSelection()}
      />
    </svg>

    {#if showBreakdownPanel && breakdownPoint}
        {@const { series, point } = breakdownPoint}
        <ChartHoverBreakdownPanel
          open={showBreakdownPanel}
          dismissable={breakdownDismissable}
          onDismiss={() => chartSelection.dismissBreakdown()}
          chartBounds={breakdownChartBounds}
          {avoidPoints}
        >
          <p class="mb-1 font-medium text-app-fg">{scenarioLabel(series.cenario)}</p>
          <dl class="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-app-muted">
            <dt>{point.mes <= 0 ? "Momento" : "Mês"}</dt>
            <dd class="font-mono text-app-fg">
              {#if point.mes === 0}
                Compra
              {:else}
                {point.mes}
                <span class="font-sans text-app-subtle">
                  ({formatTimingMonthLabelLong(point.mes)})
                </span>
              {/if}
            </dd>
            {#if point.mes === 0}
              <dt>Capital disponível</dt>
              <dd class="font-mono text-green">{formatCurrency(point.capitalInicial)}</dd>
              <dt>Entrada</dt>
              <dd class="font-mono text-salmon">−{formatCurrency(point.entrada)}</dd>
              <dt>Fechamento</dt>
              <dd class="font-mono text-salmon">−{formatCurrency(point.custosFechamento)}</dd>
            {:else}
              <dt>Renda</dt>
              <dd class="font-mono text-green">{formatCurrency(point.renda)}</dd>
              {#if point.receitaVenda > 0}
                <dt>Receita da venda</dt>
                <dd class="font-mono text-green">{formatCurrency(point.receitaVenda)}</dd>
              {/if}
              {#if point.receitaExtra > 0}
                <dt>Quantia recebida</dt>
                <dd class="font-mono text-green">{formatCurrency(point.receitaExtra)}</dd>
              {/if}
              <dt>Prestação</dt>
              <dd class="font-mono">{formatCurrency(point.prestacao)}</dd>
              {#if point.aporteExtra > 0}
                <dt>Aporte</dt>
                <dd class="font-mono">{formatCurrency(point.aporteExtra)}</dd>
              {/if}
              {#if point.reforma > 0}
                <dt>Reforma</dt>
                <dd class="font-mono">{formatCurrency(point.reforma)}</dd>
              {/if}
              {#if point.manutencao > 0}
                <dt>Manutenção</dt>
                <dd class="font-mono">{formatCurrency(point.manutencao)}</dd>
              {/if}
              {#if point.custoMensal > 0}
                <dt>Custo mensal</dt>
                <dd class="font-mono">{formatCurrency(point.custoMensal)}</dd>
              {/if}
              {#if point.amortizacaoVenda > 0}
                <dt>Amortização da venda</dt>
                <dd class="font-mono">{formatCurrency(point.amortizacaoVenda)}</dd>
              {/if}
              {#if point.amortizacaoExtra > 0}
                <dt>Amortização extra</dt>
                <dd class="font-mono">{formatCurrency(point.amortizacaoExtra)}</dd>
              {/if}
              <dt>Total de receitas</dt>
              <dd class="font-mono text-green">{formatCurrency(point.totalReceitas)}</dd>
              <dt>Total de despesas</dt>
              <dd class="font-mono text-salmon">{formatCurrency(point.totalDespesas)}</dd>
            {/if}
            <dt>Fluxo líquido</dt>
            <dd class={cn("font-mono", point.fluxoLiquido < 0 ? "text-salmon" : "text-green")}>
              {formatCurrency(point.fluxoLiquido)}
            </dd>
            <dt class="font-bold text-app-accent">Saldo acumulado</dt>
            <dd
              class={cn(
                "font-mono font-bold",
                point.saldo < 0 ? "text-salmon" : "text-app-accent"
              )}
            >
              {formatCurrency(point.saldo)}
            </dd>
          </dl>
        </ChartHoverBreakdownPanel>
    {/if}
  </div>

  <ChartLegend entries={legendEntries} note={legendNote} />
</CollapsibleChartPanel>
