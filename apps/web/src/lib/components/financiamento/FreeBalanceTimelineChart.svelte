<script lang="ts">
  import {
    buildMonthGridTicks,
    buildXAxisLabelTicks,
    CHART_HEIGHT,
    CHART_PADDING,
    breakdownMarkerLocal,
    monthPitch,
    prePurchaseReferenceLineX,
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
    maxScenarioTermMonths,
    scenarioEventLegendEntries,
    scenarioChartColor,
    scenarioColorIndexMap,
    type ChartEventLegendEntry,
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
  import { renderedRecurringFreeBalance } from "$lib/components/financiamento/chart-event-path";
  import { freeBalanceGraphBreakdownText } from "$lib/components/financiamento/graph-breakdown-copy";
  import {
    monthlyCashEventBreakdown,
    monthlyRecurringExpenseBreakdown
  } from "$lib/components/financiamento/monthly-cash-flow";
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
  import type { TimelineMonth } from "$lib/financiamento/financing-timeline";
  import { cn } from "$lib/utils";

  let {
    cenarios,
    custoMensal = 0,
    scenarioColorIndex,
    breakdownAnchorSide
  }: {
    cenarios: CenarioCompleto[];
    custoMensal?: number;
    scenarioColorIndex?: Map<string, number>;
    breakdownAnchorSide?: "left" | "right";
  } = $props();

  const resolvedColorIndex = $derived(scenarioColorIndex ?? scenarioColorIndexMap(cenarios));

  const padding = CHART_PADDING;
  const height = CHART_HEIGHT;
  const maxMonth = $derived(maxScenarioTermMonths(cenarios));
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

  const columnPitch = $derived(monthPitch(plotWidth, maxMonth));

  const breakdownChartBounds = $derived.by(() => {
    if (!svgEl) return null;
    return svgPlotBoundsToLocal(svgEl, chartWidth, height, padding);
  });

  const breakdownMarkerPoint = $derived.by(() => {
    if (!showBreakdownPanel || !svgEl || !breakdownPoint) return null;
    const { cenario, month } = breakdownPoint;
    const resolvedMonth =
      breakdownPoint.mes === 0 ? cenario.timeline[0] : month;
    if (!resolvedMonth) return null;
    const idx = cenario.timeline.findIndex((item) => item.mes === resolvedMonth.mes);
    if (idx < 0) return null;
    const svgX = xForMonth(breakdownPoint.mes, maxMonth, chartWidth, padding);
    const svgY = yForLedgerValue(
      freeBalanceAtHover(cenario, idx, custoMensal),
      yAxis,
      height,
      padding
    );
    return breakdownMarkerLocal(svgEl, svgX, svgY, chartWidth, height);
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
    return cenarios.flatMap((other) => {
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
          color: scenarioChartColor(other.id, resolvedColorIndex),
          active: other.id === focusPoint.cenario.id
        }
      ];
    });
  });

  const legendEntries = $derived(scenarioLegendEntries(cenarios, resolvedColorIndex));
  const eventLegendEntries = $derived([
    ...scenarioEventLegendEntries(cenarios),
    ...cashEventLegendEntries(cenarios)
  ]);
  const copyText = $derived(freeBalanceGraphBreakdownText(cenarios, custoMensal));

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

  function cashEventMarkerMonths(cenario: CenarioCompleto): TimelineMonth[] {
    return cenario.timeline.filter((month) => monthlyCashEventBreakdown(month).total > 0);
  }

  function cashEventMarkerTitle(month: TimelineMonth): string {
    return monthlyCashEventBreakdown(month).events
      .map((event) => `Evento: ${event.label} ${formatCurrency(event.value)}`)
      .join(" · ");
  }

  function cashEventLegendEntries(cenarios: CenarioCompleto[]): ChartEventLegendEntry[] {
    return cenarios.some((cenario) => cenario.timeline.some((month) => monthlyCashEventBreakdown(month).total > 0))
      ? [{ id: "evento-caixa", label: "Evento de caixa", kind: "cash" }]
      : [];
  }
</script>

<CollapsibleChartPanel
  title="Saldo livre"
  empty={cenarios.length === 0}
  {copyText}
  copyLabel="Copiar detalhamento do saldo livre"
>
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
        {#each cenarios as cenario (cenario.id)}
          {@const color = scenarioChartColor(cenario.id, resolvedColorIndex)}
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
          {#each cashEventMarkerMonths(cenario) as eventMonth (`${cenario.id}-${eventMonth.mes}`)}
            {@const eventX = markerX(eventMonth.mes)}
            {@const eventSlot = (resolvedColorIndex.get(cenario.id) ?? 0) % 3}
            {#if eventX !== null}
              <g
                transform={`translate(${eventX} ${padding.top + 16 + eventSlot * 10})`}
                opacity={activeCenarioId && !isActive ? 0.3 : 0.9}
              >
                <path d="M 0 -5 L 5 0 L 0 5 L -5 0 Z" fill={color} />
                <title>{cashEventMarkerTitle(eventMonth)}</title>
              </g>
            {/if}
          {/each}
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
        {@const gastos = monthlyRecurringExpenseBreakdown(month, custoMensal)}
        {@const eventosCaixa = monthlyCashEventBreakdown(month)}
        {@const saldoLivre = renderedRecurringFreeBalance(month, cenario.rendaMensal, custoMensal)}
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
              {#if gastos.outros > 0}
                <dt>Outros</dt>
                <dd class="font-mono">{formatCurrency(gastos.outros)}</dd>
              {/if}
              {#if gastos.manutencao > 0}
                <dt>Manutenção</dt>
                <dd class="font-mono">{formatCurrency(gastos.manutencao)}</dd>
              {/if}
              {#if gastos.custoMensal > 0}
                <dt>Custo mensal</dt>
                <dd class="font-mono">{formatCurrency(gastos.custoMensal)}</dd>
              {/if}
              <dt>Gasto recorrente</dt>
              <dd class="font-mono text-salmon">{formatCurrency(gastos.total)}</dd>
              <dt class="font-bold text-app-accent">Saldo livre recorrente</dt>
              <dd
                class={cn(
                  "font-mono font-bold",
                  saldoLivre < 0 ? "text-salmon" : "text-app-accent"
                )}
              >
                {formatCurrency(saldoLivre)}
              </dd>
              {#if eventosCaixa.total > 0}
                <dt class="pt-1 font-semibold text-app-fg">Eventos de caixa</dt>
                <dd></dd>
                {#each eventosCaixa.events as event}
                  <dt>Evento: {event.label}</dt>
                  <dd class="font-mono">{formatCurrency(event.value)}</dd>
                {/each}
              {/if}
          </dl>
        </ChartHoverBreakdownPanel>
    {/if}
  </div>

  <ChartLegend entries={legendEntries} eventEntries={eventLegendEntries} />
</CollapsibleChartPanel>
