<script lang="ts">
  import {
    buildMonthGridTicks,
    buildNiceYAxisScale,
    buildXAxisLabelTicks,
    CHART_HEIGHT,
    CHART_PADDING,
    maxPaymentData,
    monthPitch,
    breakdownMarkerLocal,
    paymentAtHover,
    pickChartHoverForPayment,
    polylinePointsForPayment,
    prePurchaseReferenceLineX,
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
    maxScenarioTermMonths,
    scenarioChartColor,
    scenarioColorIndexMap,
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
  import { formatTimingMonthLabelLong } from "$lib/components/financiamento/parameter-row-helpers";
  import {
    formatCurrency,
    formatCurrencyCompact,
    type CenarioCompleto
  } from "$lib/financiamento/calculations";

  let {
    cenarios,
    scenarioColorIndex,
    breakdownAnchorSide
  }: {
    cenarios: CenarioCompleto[];
    scenarioColorIndex?: Map<string, number>;
    breakdownAnchorSide?: "left" | "right";
  } = $props();

  const resolvedColorIndex = $derived(scenarioColorIndex ?? scenarioColorIndexMap(cenarios));

  const padding = CHART_PADDING;
  const height = CHART_HEIGHT;
  const legendNote =
    "Prestação do financiamento ao longo do tempo · clique para selecionar ou desselecionar · linhas tracejadas verticais: venda · círculo no topo: quantia extra · quadrado inferior: reforma concluída";

  const maxMonth = $derived(maxScenarioTermMonths(cenarios));

  const yAxis = $derived(buildNiceYAxisScale(maxPaymentData(cenarios)));
  const maxValue = $derived(yAxis.max);

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
      y: yForBalance(value, maxValue, height, padding)
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

  const columnPitch = $derived(monthPitch(plotWidth, maxMonth));

  const breakdownChartBounds = $derived.by(() => {
    if (!svgEl) return null;
    return svgPlotBoundsToLocal(svgEl, chartWidth, height, padding);
  });

  const breakdownMarkerPoint = $derived.by(() => {
    if (!showBreakdownPanel || !svgEl || !breakdownPoint) return null;
    const { cenario, month } = breakdownPoint;
    const idx =
      breakdownPoint.mes === 0 ? 0 : cenario.timeline.findIndex((item) => item.mes === month.mes);
    if (idx < 0) return null;
    const svgX = xForMonth(breakdownPoint.mes, maxMonth, chartWidth, padding);
    const svgY = yForBalance(paymentAtHover(cenario, idx), maxValue, height, padding);
    return breakdownMarkerLocal(svgEl, svgX, svgY, chartWidth, height);
  });

  const focusDots = $derived.by(() => {
    if (!focusPoint) return [];
    const { cenario, month } = focusPoint;
    return cenarios.flatMap((other) => {
      const idx = focusPoint.mes === 0 ? 0 : other.timeline.findIndex((m) => m.mes === month.mes);
      if (idx < 0) return [];
      return [
        {
          id: other.id,
          x: xForMonth(focusPoint.mes, maxMonth, chartWidth, padding),
          y: yForBalance(paymentAtHover(other, idx), maxValue, height, padding),
          color: scenarioChartColor(other.id, resolvedColorIndex),
          active: other.id === cenario.id
        }
      ];
    });
  });

  const legendEntries = $derived(scenarioLegendEntries(cenarios, resolvedColorIndex));

  function handleChartPointerMove(event: PointerEvent) {
    if (!svgEl) return;
    if (chartSelection.selection && !chartSelection.breakdownDismissed) {
      hover = null;
      return;
    }
    const { x, y } = svgPointFromPointer(svgEl, event, chartWidth, height);
    const next = pickChartHoverForPayment(
      cenarios,
      x,
      y,
      maxMonth,
      maxValue,
      chartWidth,
      hover
    );
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
    const pick = pickChartHoverForPayment(
      cenarios,
      x,
      y,
      maxMonth,
      maxValue,
      chartWidth,
      hover
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
    if (month === undefined) return null;
    return xForMonth(month, maxMonth, chartWidth, padding);
  }
</script>

<CollapsibleChartPanel title="Prestações" empty={cenarios.length === 0}>
  <div bind:this={chartContainer} class="relative w-full">
    <svg
      bind:this={svgEl}
      viewBox="0 0 {chartWidth} {height}"
      class="h-auto w-full select-none touch-none"
      role="img"
      aria-label="Gráfico de prestações por cenário"
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
        {#each cenarios as cenario (cenario.id)}
          {@const color = scenarioChartColor(cenario.id, resolvedColorIndex)}
          {@const points = polylinePointsForPayment(
            cenario,
            maxMonth,
            maxValue,
            chartWidth
          )}
          {@const isActive = activeCenarioId === cenario.id}
          {#if points}
            <polyline
              fill="none"
              stroke={color}
              stroke-width={isActive ? 2.5 : 2}
              stroke-linejoin="miter"
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
      {@const amortizacaoRegular = Math.max(
        0,
        month.saldoDevedor - month.saldoDevedorFim - month.amortizacaoExtraordinaria
      )}
      {@const jurosEstimado = Math.max(0, month.prestacao - amortizacaoRegular)}
      <ChartHoverBreakdownPanel
        open={showBreakdownPanel}
        dismissable={breakdownDismissable}
        onDismiss={() => chartSelection.dismissBreakdown()}
        anchorEl={chartContainer}
        chartBounds={breakdownChartBounds}
        anchorSide={breakdownAnchorSide}
        markerPoint={breakdownMarkerPoint}
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
          <dt class="font-bold text-app-accent">Prestação</dt>
          <dd class="font-mono font-bold text-app-accent">{formatCurrency(month.prestacao)}</dd>
          <dt>Amortização</dt>
          <dd class="font-mono">{formatCurrency(amortizacaoRegular)}</dd>
          <dt>Juros</dt>
          <dd class="font-mono text-salmon">{formatCurrency(jurosEstimado)}</dd>
          <dt>Saldo devedor</dt>
          <dd class="font-mono text-app-fg">{formatCurrency(month.saldoDevedorFim)}</dd>
        </dl>
      </ChartHoverBreakdownPanel>
    {/if}
  </div>

  <ChartLegend entries={legendEntries} note={legendNote} />
</CollapsibleChartPanel>
