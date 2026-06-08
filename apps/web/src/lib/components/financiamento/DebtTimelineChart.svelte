<script lang="ts">
  import {
    buildMonthGridTicks,
    buildNiceYAxisScale,
    buildXAxisLabelTicks,
    CHART_HEIGHT,
    CHART_PADDING,
    maxSaldoDevedorData,
    monthPitch,
    pickChartHover,
    polylinePoints,
    debtBalanceAtHover,
    prePurchaseReferenceLineX,
    svgCoordsToLocal,
    svgPlotBoundsToLocal,
    svgPointFromPointer,
    xForMonth,
    yForBalance,
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
    hoverMatchesSelection,
    isChartPointerClick,
    resolveTimelineSelection,
    selectionFromTimelinePointer
  } from "$lib/components/financiamento/chart-selection";
  import { getChartSelectionContext } from "$lib/components/financiamento/chart-selection-context.svelte";
  import { renderedDebtBalance } from "$lib/components/financiamento/chart-event-path";
  import { formatTimingMonthLabelLong } from "$lib/components/financiamento/parameter-row-helpers";
  import {
    monthlyExpenseBreakdown,
    monthlyFreeBalance
  } from "$lib/components/financiamento/monthly-cash-flow";
  import {
    formatCurrency,
    formatCurrencyCompact,
    type CenarioCompleto
  } from "$lib/financiamento/calculations";
  import { cn } from "$lib/utils";

  let {
    cenarios,
    custoMensal = 0
  }: {
    cenarios: CenarioCompleto[];
    custoMensal?: number;
  } = $props();

  const padding = CHART_PADDING;
  const height = CHART_HEIGHT;
  const legendNote =
    "Passe o mouse sobre o gráfico para ver cada mês · clique para selecionar ou desselecionar · linhas tracejadas: venda · círculo no topo: quantia extra · quadrado inferior: reforma concluída";

  const maxMonth = $derived(
    Math.max(1, ...cenarios.flatMap((c) => c.timeline.map((m) => m.mes)), 1)
  );

  const yAxis = $derived(buildNiceYAxisScale(maxSaldoDevedorData(cenarios)));
  const maxBalance = $derived(yAxis.max);

  let chartContainer = $state<HTMLDivElement | null>(null);
  const chartSize = useResponsiveChartWidth(() => chartContainer);
  const chartWidth = $derived(chartSize.chartWidth);

  const plotWidth = $derived(chartWidth - padding.left - padding.right);
  const plotHeight = $derived(height - padding.top - padding.bottom);

  const xMonthGrid = $derived(buildMonthGridTicks(maxMonth, chartWidth, padding));
  const prePurchaseX = $derived(prePurchaseReferenceLineX(maxMonth, chartWidth, padding));

  const xLabelTicks = $derived(
    buildXAxisLabelTicks(maxMonth, chartWidth, formatTimingMonthLabelLong, padding)
  );

  const yTicks = $derived.by(() =>
    yAxis.ticks.map((value) => ({
      key: value,
      label: formatCurrencyCompact(value),
      y: yForBalance(value, maxBalance, height, padding)
    }))
  );

  let svgEl = $state<SVGSVGElement | null>(null);
  let hover = $state<ChartHover | null>(null);
  let pointerDown = $state<{ x: number; y: number } | null>(null);

  const chartSelection = getChartSelectionContext();

  const hoveredPoint = $derived.by(() => {
    const active = hover;
    if (!active) return null;
    const cenario = cenarios.find((c) => c.id === active.cenarioId);
    if (!cenario) return null;
    const month = cenario.timeline[active.monthIndex];
    if (!month) return null;
    return { cenario, month, mes: active.mes ?? month.mes };
  });

  const selectedPoint = $derived.by(() => {
    if (!chartSelection.selection) return null;
    return resolveTimelineSelection(chartSelection.selection, cenarios);
  });

  const focusPoint = $derived(selectedPoint ?? hoveredPoint);
  const isSelectionPinned = $derived(!!selectedPoint);
  const breakdownPoint = $derived(
    isSelectionPinned && !chartSelection.breakdownDismissed ? selectedPoint : hoveredPoint
  );
  const isHoveringSelectedPoint = $derived(
    !!hover &&
      !!chartSelection.selection &&
      hoverMatchesSelection(hover, chartSelection.selection, cenarios)
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
      ? xForMonth(focusPoint.mes, maxMonth, chartWidth, padding)
      : null
  );

  const breakdownX = $derived(
    breakdownPoint
      ? xForMonth(breakdownPoint.mes, maxMonth, chartWidth, padding)
      : null
  );

  const breakdownY = $derived.by(() => {
    if (!breakdownPoint) return null;
    if (breakdownPoint.mes === 0) {
      return yForBalance(
        breakdownPoint.cenario.financiamento.valorFinanciado,
        maxBalance,
        height,
        padding
      );
    }
    const idx = breakdownPoint.cenario.timeline.findIndex((m) => m.mes === breakdownPoint.month.mes);
    if (idx < 0) return null;
    return yForBalance(
      debtBalanceAtHover(breakdownPoint.cenario, idx),
      maxBalance,
      height,
      padding
    );
  });

  const columnPitch = $derived(monthPitch(plotWidth, maxMonth));

  const breakdownChartBounds = $derived.by(() => {
    if (!svgEl) return null;
    return svgPlotBoundsToLocal(svgEl, chartWidth, height, padding);
  });

  const avoidPoints = $derived.by(() => {
    if (!showBreakdownPanel || !svgEl || breakdownX === null || breakdownY === null) return [];
    return [svgCoordsToLocal(svgEl, breakdownX, breakdownY, chartWidth, height)];
  });

  const focusDots = $derived.by(() => {
    if (!focusPoint) return [];
    const { cenario, month } = focusPoint;
    return cenarios.flatMap((other, index) => {
      const idx = focusPoint.mes === 0 ? 0 : other.timeline.findIndex((m) => m.mes === month.mes);
      if (idx < 0) return [];
      return [
        {
          id: other.id,
          x: xForMonth(focusPoint.mes, maxMonth, chartWidth, padding),
          y: yForBalance(
            focusPoint.mes === 0
              ? other.financiamento.valorFinanciado
              : debtBalanceAtHover(other, idx),
            maxBalance,
            height,
            padding
          ),
          color: chartColor(index),
          active: other.id === cenario.id
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
    const next = pickChartHover(cenarios, x, y, maxMonth, maxBalance, chartWidth, hover);
    if (chartSelection.selection && chartSelection.breakdownDismissed) {
      hover =
        next && hoverMatchesSelection(next, chartSelection.selection, cenarios) ? next : null;
      return;
    }
    if (
      next &&
      hover &&
      next.cenarioId === hover.cenarioId &&
      next.monthIndex === hover.monthIndex &&
      next.mes === hover.mes
    ) {
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
    const pick = pickChartHover(cenarios, x, y, maxMonth, maxBalance, chartWidth, hover);
    if (!pick) return;
    const selection = selectionFromTimelinePointer(x, pick, maxMonth, chartWidth);
    if (!selection) return;
    chartSelection.toggleSelection(selection);
  }

  function handleChartPointerLeave() {
    pointerDown = null;
    hover = null;
  }

  function markerX(month: number | undefined): number | null {
    if (month === undefined) return null;
    return xForMonth(month, maxMonth, chartWidth, padding);
  }
</script>

<CollapsibleChartPanel title="Saldo devedor (Financiamento)" empty={cenarios.length === 0}>
  <div bind:this={chartContainer} class="relative w-full">
    <svg
      bind:this={svgEl}
      viewBox="0 0 {chartWidth} {height}"
      class="h-auto w-full select-none touch-none"
      role="img"
      aria-label="Gráfico de saldo devedor por cenário"
    >
      <TimelineChartAxes
        {yTicks}
        {xMonthGrid}
        {xLabelTicks}
        {prePurchaseX}
        {chartWidth}
        {height}
        {padding}
      />

      <g class="pointer-events-none">
        {#each cenarios as cenario, i (cenario.id)}
          {@const color = chartColor(i)}
          {@const points = polylinePoints(cenario, maxMonth, maxBalance, chartWidth)}
          {@const isActive = activeCenarioId === cenario.id}
          {#if points}
            <polyline
              fill="none"
              stroke={color}
              stroke-width={isActive ? 2.5 : 2}
              stroke-linejoin="round"
              stroke-linecap="round"
              points={points}
              opacity={activeCenarioId && !isActive ? 0.3 : 1}
            />
          {/if}
          <ScenarioChartMarkers {cenario} {color} {markerX} {padding} {height} />
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
      {@const { cenario, month } = breakdownPoint}
      {@const mes = breakdownPoint.mes}
      {@const gastos = monthlyExpenseBreakdown(month, custoMensal)}
      {@const saldoLivre = monthlyFreeBalance(month, cenario.rendaMensal, custoMensal)}
      <ChartHoverBreakdownPanel
        open={showBreakdownPanel}
        dismissable={breakdownDismissable}
        onDismiss={() => chartSelection.dismissBreakdown()}
        chartBounds={breakdownChartBounds}
        {avoidPoints}
      >
        <p class="mb-1 font-medium text-app-fg">{scenarioLabel(cenario)}</p>
        <dl class="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-app-muted">
          <dt>Mês</dt>
          <dd class="font-mono text-app-fg">
            {#if mes === 0}
              Compra
            {:else}
              {mes}
              <span class="font-sans text-app-subtle">
                ({formatTimingMonthLabelLong(mes)})
              </span>
            {/if}
          </dd>
          <dt>Saldo devedor</dt>
          <dd class="font-mono text-app-fg">
            {formatCurrency(
              mes === 0 ? cenario.financiamento.valorFinanciado : renderedDebtBalance(month)
            )}
          </dd>
          <dt>Prestação</dt>
          <dd class="font-mono">{formatCurrency(gastos.prestacao)}</dd>
          {#if gastos.aporteExtra > 0}
            <dt>Aporte</dt>
            <dd class="font-mono">{formatCurrency(gastos.aporteExtra)}</dd>
          {/if}
          {#if gastos.reforma > 0}
            <dt>Reforma</dt>
            <dd class="font-mono">{formatCurrency(gastos.reforma)}</dd>
          {/if}
          {#if gastos.manutencao > 0}
            <dt>Manutenção</dt>
            <dd class="font-mono">{formatCurrency(gastos.manutencao)}</dd>
          {/if}
          {#if gastos.custoMensal > 0}
            <dt>Custo mensal</dt>
            <dd class="font-mono">{formatCurrency(gastos.custoMensal)}</dd>
          {/if}
          {#if month.amortizacaoVenda > 0}
            <dt>Venda</dt>
            <dd class="font-mono text-green">{formatCurrency(month.amortizacaoVenda)}</dd>
          {/if}
          {#if month.amortizacaoQuantiaExtra > 0}
            <dt>Quantia extra</dt>
            <dd class="font-mono text-green">{formatCurrency(month.amortizacaoQuantiaExtra)}</dd>
          {/if}
          <dt class="font-bold text-app-accent">Gasto mensal</dt>
          <dd class="font-mono font-bold text-app-accent">{formatCurrency(gastos.total)}</dd>
          <dt>Saldo livre</dt>
          <dd class={cn("font-mono", saldoLivre < 0 ? "text-salmon" : "text-green")}>
            {formatCurrency(saldoLivre)}
          </dd>
        </dl>
      </ChartHoverBreakdownPanel>
    {/if}
  </div>

  <ChartLegend entries={legendEntries} note={legendNote} />
</CollapsibleChartPanel>
