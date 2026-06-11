<script lang="ts">
  import {
    CHART_HEIGHT,
    CHART_PADDING,
    svgPlotBoundsToLocal,
    svgPointFromPointer
  } from "$lib/components/financiamento/debt-timeline-chart-math";
  import ChartHoverBreakdownPanel from "$lib/components/financiamento/ChartHoverBreakdownPanel.svelte";
  import CollapsibleChartPanel from "$lib/components/financiamento/charts/CollapsibleChartPanel.svelte";
  import TimelineChartAxes from "$lib/components/financiamento/charts/TimelineChartAxes.svelte";
  import TimelineFocusLayer from "$lib/components/financiamento/charts/TimelineFocusLayer.svelte";
  import { useResponsiveChartWidth } from "$lib/components/financiamento/charts/use-responsive-chart-width.svelte";
  import {
    buildPlanningXGridTicks,
    buildPlanningXLabelTicks,
    buildPlanningYAxisScale,
    formatPlanningAxisMonthLabel,
    formatPlanningMonthLabel,
    pickPlanningHover,
    planningMonthPitch,
    polylinePointsForPlanningSeries,
    visiblePlanningMonths,
    xForPlanningMonth,
    yForLedgerValue,
    type PlanningChartHover
  } from "$lib/components/planejamento/planning-chart-math";
  import type { TimeAxisViewport } from "$lib/components/planejamento/time-axis";
  import { formatCurrency, formatCurrencyCompact } from "$lib/financiamento/calculations";
  import type { PlanningMonthResult } from "$lib/planejamento/types";
  import { cn } from "$lib/utils";

  let {
    months,
    viewport,
    startDate,
    breakdownAnchorSide = "left",
    onHoverMonth
  }: {
    months: PlanningMonthResult[];
    viewport: TimeAxisViewport;
    startDate: string;
    breakdownAnchorSide?: "left" | "right";
    onHoverMonth?: (monthIndex: number | null) => void;
  } = $props();

  const padding = CHART_PADDING;
  const height = CHART_HEIGHT;
  const legendNote =
    "Receitas menos despesas no mês · linha horizontal tracejada: saldo zero";

  const visibleMonths = $derived(visiblePlanningMonths(months, viewport));
  const yAxis = $derived(
    buildPlanningYAxisScale(visibleMonths.map((month) => month.netIncome))
  );

  let chartContainer = $state<HTMLDivElement | null>(null);
  let svgEl = $state<SVGSVGElement | null>(null);
  let hover = $state<PlanningChartHover | null>(null);

  const chartSize = useResponsiveChartWidth(() => chartContainer);
  const chartReady = $derived(chartSize.containerWidth > 0);
  const chartWidth = $derived(chartSize.chartWidth);
  const plotWidth = $derived(chartWidth - padding.left - padding.right);
  const plotHeight = $derived(height - padding.top - padding.bottom);

  const hoveredMonth = $derived(
    hover === null ? null : months.find((month) => month.monthIndex === hover.monthIndex) ?? null
  );

  const focusX = $derived(
    hover ? xForPlanningMonth(hover.monthIndex, viewport, plotWidth, padding) : null
  );
  const columnPitch = $derived(planningMonthPitch(viewport, plotWidth));
  const xMonthGrid = $derived(
    buildPlanningXGridTicks(viewport, chartWidth, padding).map((tick) => ({
      month: tick.monthIndex,
      x: tick.x
    }))
  );
  const xLabelTicks = $derived(
    buildPlanningXLabelTicks(viewport, chartWidth, (monthIndex) =>
      formatPlanningAxisMonthLabel(startDate, monthIndex)
    , padding).map((tick) => ({
      month: tick.monthIndex,
      x: tick.x,
      label: tick.label,
      kind: tick.kind,
      textAnchor: tick.textAnchor
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
  const zeroY = $derived(yForLedgerValue(0, yAxis, height, padding));
  const referenceLines = $derived(yAxis.ticks.includes(0) ? [] : [{ id: "zero", y: zeroY }]);
  const prePurchaseX = padding.left - 1;

  const focusDots = $derived.by(() => {
    if (!hover || !hoveredMonth) return [];
    return [
      {
        id: "planning",
        x: xForPlanningMonth(hover.monthIndex, viewport, plotWidth, padding),
        y: yForLedgerValue(hoveredMonth.netIncome, yAxis, height, padding),
        color: "var(--color-app-accent)",
        active: true
      }
    ];
  });

  const breakdownChartBounds = $derived.by(() => {
    if (!svgEl) return null;
    return svgPlotBoundsToLocal(svgEl, chartWidth, height, padding);
  });

  const breakdownMarkerPoint = $derived.by(() => {
    if (!hoveredMonth || !svgEl || !focusX) return null;
    const svgY = yForLedgerValue(hoveredMonth.netIncome, yAxis, height, padding);
    const rect = svgEl.getBoundingClientRect();
    return {
      x: rect.left + (focusX / chartWidth) * rect.width,
      y: rect.top + (svgY / height) * rect.height
    };
  });

  function handleChartPointerMove(event: PointerEvent) {
    if (!svgEl) return;
    const { x, y } = svgPointFromPointer(svgEl, event, chartWidth, height);
    const next = pickPlanningHover(
      months,
      viewport,
      x,
      y,
      (month) => month.netIncome,
      yAxis,
      chartWidth,
      height,
      hover,
      padding
    );
    hover = next;
    onHoverMonth?.(next?.monthIndex ?? null);
  }

  function handleChartPointerLeave() {
    hover = null;
    onHoverMonth?.(null);
  }
</script>

<CollapsibleChartPanel title="Saldo livre" empty={months.length === 0}>
  <div bind:this={chartContainer} class="relative w-full" style:min-height="{height}px">
    {#if chartReady}
    <svg
      bind:this={svgEl}
      viewBox="0 0 {chartWidth} {height}"
      class="block w-full touch-none select-none"
      style:height="{height}px"
      role="img"
      aria-label="Gráfico de saldo livre mensal do planejamento"
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

      <polyline
        class="pointer-events-none stroke-app-accent"
        fill="none"
        stroke-width="2.5"
        stroke-linejoin="round"
        stroke-linecap="round"
        points={polylinePointsForPlanningSeries(
          months,
          viewport,
          (month) => month.netIncome,
          yAxis,
          chartWidth,
          height,
          padding
        )}
      />

      <rect
        x={padding.left}
        y={padding.top}
        width={plotWidth}
        height={plotHeight}
        fill="transparent"
        class="cursor-crosshair"
        aria-hidden="true"
        onpointermove={handleChartPointerMove}
        onpointerleave={handleChartPointerLeave}
      />

      <TimelineFocusLayer
        {focusX}
        dots={focusDots}
        isSelectionPinned={false}
        {columnPitch}
        {padding}
        {plotHeight}
        {height}
        onDismiss={() => {}}
      />
    </svg>
    {/if}

    {#if hoveredMonth}
      <ChartHoverBreakdownPanel
        open={!!hoveredMonth}
        dismissable={false}
        anchorEl={chartContainer}
        chartBounds={breakdownChartBounds}
        anchorSide={breakdownAnchorSide}
        markerPoint={breakdownMarkerPoint}
      >
        <p class="mb-1 font-medium text-app-fg">Planejamento</p>
        <dl class="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-app-muted">
          <dt>Mês</dt>
          <dd class="font-mono text-app-fg">
            {hoveredMonth.monthIndex}
            <span class="font-sans text-app-subtle">
              ({formatPlanningMonthLabel(startDate, hoveredMonth.monthIndex)})
            </span>
          </dd>
          <dt>Receitas</dt>
          <dd class="font-mono text-green">{formatCurrency(hoveredMonth.income)}</dd>
          <dt>Despesas</dt>
          <dd class="font-mono text-salmon">{formatCurrency(hoveredMonth.expenses)}</dd>
          <dt class="font-bold text-app-accent">Saldo livre</dt>
          <dd
            class={cn(
              "font-mono font-bold",
              hoveredMonth.netIncome < 0 ? "text-salmon" : "text-app-accent"
            )}
          >
            {formatCurrency(hoveredMonth.netIncome)}
          </dd>
        </dl>
      </ChartHoverBreakdownPanel>
    {/if}
  </div>

  <p class="px-2 pb-2 text-[11px] leading-relaxed text-app-muted sm:px-3">{legendNote}</p>
</CollapsibleChartPanel>
