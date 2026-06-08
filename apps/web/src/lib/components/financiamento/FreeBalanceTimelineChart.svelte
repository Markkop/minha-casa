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
    xForMonth,
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
  import {
    freeBalanceAtHover,
    freeBalanceValues,
    pickChartHoverForFreeBalance,
    polylinePointsForFreeBalance
  } from "$lib/components/financiamento/free-balance-chart-math";
  import { renderedFreeBalance } from "$lib/components/financiamento/chart-event-path";
  import { monthlyExpenseBreakdown } from "$lib/components/financiamento/monthly-cash-flow";
  import { formatTimingMonthLabelLong } from "$lib/components/financiamento/parameter-row-helpers";
  import {
    buildSignedYAxisScale,
    yForLedgerValue
  } from "$lib/components/financiamento/total-balance-ledger";
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
    "Renda mensal menos todos os gastos mensais · clique para selecionar ou desselecionar · linha horizontal tracejada: saldo zero · linhas verticais tracejadas: venda · círculo no topo: quantia extra · quadrado inferior: reforma concluída";
  const maxMonth = $derived(
    Math.max(1, ...cenarios.flatMap((cenario) => cenario.timeline.map((month) => month.mes)))
  );
  const yAxis = $derived(buildSignedYAxisScale(freeBalanceValues(cenarios, custoMensal)));

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
    const active = hover;
    if (!active) return null;
    const cenario = cenarios.find((item) => item.id === active.cenarioId);
    if (!cenario) return null;
    const month = cenario.timeline[active.monthIndex];
    return month ? { cenario, month, mes: active.mes ?? month.mes } : null;
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
    const idx = breakdownPoint.cenario.timeline.findIndex((m) => m.mes === breakdownPoint.month.mes);
    if (idx < 0) return null;
    return yForLedgerValue(
      freeBalanceAtHover(breakdownPoint.cenario, idx, custoMensal),
      yAxis,
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

  const zeroY = $derived(yForLedgerValue(0, yAxis, height, padding));
  const xMonthGrid = $derived(buildMonthGridTicks(maxMonth, chartWidth, padding));
  const prePurchaseX = $derived(prePurchaseReferenceLineX(maxMonth, chartWidth, padding));
  const xLabelTicks = $derived(
    buildXAxisLabelTicks(maxMonth, chartWidth, formatTimingMonthLabelLong, padding)
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
    return cenarios.flatMap((other, index) => {
      const month =
        focusPoint.mes === 0
          ? other.timeline[0]
          : other.timeline.find((item) => item.mes === focusPoint.month.mes);
      if (!month) return [];
      const idx = other.timeline.findIndex((item) => item.mes === month.mes);
      const value = freeBalanceAtHover(other, idx, custoMensal);
      return [
        {
          id: other.id,
          x: xForMonth(focusPoint.mes, maxMonth, chartWidth, padding),
          y: yForLedgerValue(value, yAxis, height, padding),
          color: chartColor(index),
          active: other.id === focusPoint.cenario.id
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
    const next = pickChartHoverForFreeBalance(
      cenarios,
      x,
      y,
      maxMonth,
      yAxis,
      chartWidth,
      hover,
      custoMensal
    );
    if (chartSelection.selection && chartSelection.breakdownDismissed) {
      hover =
        next && hoverMatchesSelection(next, chartSelection.selection, cenarios) ? next : null;
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
    const pick = pickChartHoverForFreeBalance(
      cenarios,
      x,
      y,
      maxMonth,
      yAxis,
      chartWidth,
      hover,
      custoMensal
    );
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
    return month === undefined ? null : xForMonth(month, maxMonth, chartWidth, padding);
  }
</script>

<CollapsibleChartPanel title="Saldo livre" empty={cenarios.length === 0}>
  <div bind:this={chartContainer} class="relative w-full">
    <svg
      bind:this={svgEl}
      viewBox="0 0 {chartWidth} {height}"
      class="h-auto w-full select-none touch-none"
      role="img"
      aria-label="Gráfico de saldo livre mensal por cenário"
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
        {#each cenarios as cenario, i (cenario.id)}
          {@const color = chartColor(i)}
          {@const isActive = activeCenarioId === cenario.id}
          <polyline
            fill="none"
            stroke={color}
            stroke-width={isActive ? 2.5 : 2}
            stroke-linejoin="miter"
            stroke-linecap="round"
            points={polylinePointsForFreeBalance(
              cenario,
              maxMonth,
              yAxis,
              chartWidth,
              custoMensal
            )}
            opacity={activeCenarioId && !isActive ? 0.3 : 1}
          />
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
        {@const saldoLivre = renderedFreeBalance(month, cenario.rendaMensal, custoMensal)}
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
            <dt>Renda</dt>
            <dd class="font-mono text-green">{formatCurrency(cenario.rendaMensal)}</dd>
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
              <dt>Gasto mensal</dt>
              <dd class="font-mono text-salmon">{formatCurrency(gastos.total)}</dd>
              <dt class="font-bold text-app-accent">Saldo livre</dt>
              <dd
                class={cn(
                  "font-mono font-bold",
                  saldoLivre < 0 ? "text-salmon" : "text-app-accent"
                )}
              >
                {formatCurrency(saldoLivre)}
              </dd>
          </dl>
        </ChartHoverBreakdownPanel>
    {/if}
  </div>

  <ChartLegend entries={legendEntries} note={legendNote} />
</CollapsibleChartPanel>
