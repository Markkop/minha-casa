<script lang="ts">
  import {
    buildMonthGridTicks,
    buildXAxisLabelTicks,
    CHART_HEIGHT,
    CHART_PADDING,
    monthPitch,
    svgCoordsToLocal,
    svgPlotBoundsToLocal,
    svgPointFromPointer,
    xForMonth,
    type ChartHover
  } from "$lib/components/financiamento/debt-timeline-chart-math";
  import ChartHoverBreakdownPanel from "$lib/components/financiamento/ChartHoverBreakdownPanel.svelte";
  import ChartSelectionColumnDismiss from "$lib/components/financiamento/ChartSelectionColumnDismiss.svelte";
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
  import {
    formatTimingMonthLabel,
    formatTimingMonthLabelLong
  } from "$lib/components/financiamento/parameter-row-helpers";
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

  const CHART_COLORS = [
    "var(--color-app-accent)",
    "var(--color-salmon)",
    "#22c55e",
    "#a855f7",
    "#f59e0b",
    "#06b6d4",
    "#ec4899",
    "#84cc16"
  ];

  const padding = CHART_PADDING;
  const height = CHART_HEIGHT;
  const maxMonth = $derived(
    Math.max(1, ...cenarios.flatMap((cenario) => cenario.timeline.map((month) => month.mes)))
  );
  const yAxis = $derived(buildSignedYAxisScale(freeBalanceValues(cenarios, custoMensal)));

  let chartContainer = $state<HTMLDivElement | null>(null);
  let containerWidth = $state(0);
  let svgEl = $state<SVGSVGElement | null>(null);
  let hover = $state<ChartHover | null>(null);
  let pointerDown = $state<{ x: number; y: number } | null>(null);

  $effect(() => {
    const el = chartContainer;
    if (!el || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width ?? 0;
      if (next > 0) containerWidth = next;
    });
    observer.observe(el);
    containerWidth = el.clientWidth;
    return () => observer.disconnect();
  });

  const chartWidth = $derived(Math.max(280, containerWidth));
  const plotWidth = $derived(chartWidth - padding.left - padding.right);
  const plotHeight = $derived(height - padding.top - padding.bottom);

  const chartSelection = getChartSelectionContext();

  const hoveredPoint = $derived.by(() => {
    const active = hover;
    if (!active) return null;
    const cenario = cenarios.find((item) => item.id === active.cenarioId);
    if (!cenario) return null;
    const month = cenario.timeline[active.monthIndex];
    return month ? { cenario, month } : null;
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
      ? xForMonth(focusPoint.month.mes, maxMonth, chartWidth, padding)
      : null
  );

  const focusY = $derived.by(() => {
    if (!focusPoint) return null;
    const idx = focusPoint.cenario.timeline.findIndex((m) => m.mes === focusPoint.month.mes);
    if (idx < 0) return null;
    return yForLedgerValue(
      freeBalanceAtHover(focusPoint.cenario, idx, custoMensal),
      yAxis,
      height,
      padding
    );
  });

  const breakdownX = $derived(
    breakdownPoint
      ? xForMonth(breakdownPoint.month.mes, maxMonth, chartWidth, padding)
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
  const xLabelTicks = $derived(
    buildXAxisLabelTicks(maxMonth, chartWidth, formatTimingMonthLabelLong, padding)
  );
  const yTicks = $derived(
    yAxis.ticks.map((value) => ({
      value,
      label: formatCurrencyCompact(value),
      y: yForLedgerValue(value, yAxis, height, padding)
    }))
  );

  function scenarioLabel(cenario: CenarioCompleto): string {
    const parts = [formatCurrencyCompact(cenario.valorImovel)];
    if (cenario.estrategia === "permuta") {
      parts.push("permuta");
    } else if (cenario.vendaEm !== undefined) {
      parts.push(`venda ${formatTimingMonthLabel(cenario.vendaEm)}`);
    }
    if (cenario.extraEm !== undefined) {
      parts.push(`extra ${formatTimingMonthLabel(cenario.extraEm)}`);
    }
    return parts.join(" · ");
  }

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
    chartSelection.toggleSelection(selectionFromTimelinePointer(x, pick, maxMonth, chartWidth));
  }

  function handleChartPointerLeave() {
    pointerDown = null;
    hover = null;
  }

  function markerX(month: number | undefined): number | null {
    return month === undefined ? null : xForMonth(month, maxMonth, chartWidth, padding);
  }
</script>

{#if cenarios.length === 0}
  <p class="px-2 py-6 text-sm text-app-muted sm:px-3">
    Nenhum cenário visível para exibir o gráfico.
  </p>
{:else}
  <header class="border-b border-app-border px-2 py-2 sm:px-3">
    <h3 class="text-sm font-medium text-app-fg">Saldo livre</h3>
  </header>

  <div class="px-2 py-3 sm:px-3">
    <div bind:this={chartContainer} class="relative w-full">
      <svg
        bind:this={svgEl}
        viewBox="0 0 {chartWidth} {height}"
        class="h-auto w-full select-none touch-none"
        role="img"
        aria-label="Gráfico de saldo livre mensal por cenário"
      >
        {#each yTicks as tick (tick.value)}
          <line
            x1={padding.left}
            y1={tick.y}
            x2={chartWidth - padding.right}
            y2={tick.y}
            class={tick.value === 0 ? "stroke-app-fg" : "stroke-app-border"}
            stroke-width={tick.value === 0 ? 1.5 : 1}
            stroke-dasharray={tick.value === 0 ? "6 4" : "4 4"}
            opacity={tick.value === 0 ? 0.65 : 1}
          />
          <text
            x={padding.left - 8}
            y={tick.y + 4}
            text-anchor="end"
            class={tick.value === 0
              ? "fill-app-fg pointer-events-none text-[10px] font-medium"
              : "fill-app-muted pointer-events-none text-[10px]"}
          >
            {tick.label}
          </text>
        {/each}

        {#if !yAxis.ticks.includes(0)}
          <line
            x1={padding.left}
            y1={zeroY}
            x2={chartWidth - padding.right}
            y2={zeroY}
            class="stroke-app-fg"
            stroke-width="1.5"
            stroke-dasharray="6 4"
            opacity="0.65"
          />
        {/if}

        {#each xMonthGrid as tick (tick.month)}
          <line
            x1={tick.x}
            y1={padding.top}
            x2={tick.x}
            y2={height - padding.bottom}
            class="pointer-events-none stroke-app-border/40"
            stroke-width="1"
          />
        {/each}

        {#each xLabelTicks as tick (tick.month)}
          <line
            x1={tick.x}
            y1={height - padding.bottom}
            x2={tick.x}
            y2={height - padding.bottom + 4}
            class="pointer-events-none stroke-app-border"
            stroke-width="1"
          />
          <text
            x={tick.x}
            y={height - (tick.kind === "year" ? 8 : 20)}
            text-anchor="middle"
            class={cn(
              "pointer-events-none text-[10px]",
              tick.kind === "year" ? "fill-app-fg font-medium" : "fill-app-subtle"
            )}
          >
            {tick.label}
          </text>
        {/each}

        <g class="pointer-events-none">
          {#each cenarios as cenario, i (cenario.id)}
            {@const color = CHART_COLORS[i % CHART_COLORS.length]}
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

            {#if cenario.vendaEm}
              {@const mx = markerX(cenario.vendaEm)}
              {#if mx !== null}
                <line
                  x1={mx}
                  y1={padding.top}
                  x2={mx}
                  y2={height - padding.bottom}
                  stroke={color}
                  stroke-width="1"
                  stroke-dasharray="3 3"
                  opacity="0.45"
                />
              {/if}
            {/if}

            {#if cenario.extraEm}
              {@const mx = markerX(cenario.extraEm)}
              {#if mx !== null}
                <circle cx={mx} cy={padding.top + 6} r="4" fill={color} class="opacity-80" />
              {/if}
            {/if}

            {#if cenario.timeline.some((month) => month.reformaConcluida)}
              {@const reformMonth = cenario.timeline.find((month) => month.reformaConcluida)?.mes}
              {@const mx = reformMonth !== undefined ? markerX(reformMonth) : null}
              {#if mx !== null}
                <rect
                  x={mx - 3}
                  y={height - padding.bottom - 10}
                  width="6"
                  height="6"
                  fill={color}
                  class="opacity-70"
                />
              {/if}
            {/if}
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

        {#if focusPoint && focusX !== null}
          <g class="pointer-events-none">
            {#if isSelectionPinned}
              <rect
                x={focusX - columnPitch / 2}
                y={padding.top}
                width={columnPitch}
                height={plotHeight}
                fill="var(--color-app-accent)"
                opacity="0.08"
              />
            {/if}
            <line
              x1={focusX}
              y1={padding.top}
              x2={focusX}
              y2={height - padding.bottom}
              stroke={isSelectionPinned
                ? "var(--color-app-accent)"
                : "var(--color-app-border-strong, currentColor)"}
              stroke-width={isSelectionPinned ? 2 : 1}
              class={isSelectionPinned ? "" : "text-app-muted"}
              opacity={isSelectionPinned ? 1 : 0.9}
            />
            {#each cenarios as other, i (other.id)}
              {@const month = other.timeline.find(
                (item) => item.mes === focusPoint.month.mes
              )}
              {#if month}
                {@const idx = other.timeline.findIndex((item) => item.mes === month.mes)}
                {@const value = freeBalanceAtHover(other, idx, custoMensal)}
                <circle
                  cx={xForMonth(month.mes, maxMonth, chartWidth, padding)}
                  cy={yForLedgerValue(value, yAxis, height, padding)}
                  r={other.id === focusPoint.cenario.id ? 5 : 3}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                  opacity={other.id === focusPoint.cenario.id ? 1 : 0.35}
                  class={other.id === focusPoint.cenario.id ? "stroke-app-surface" : ""}
                  stroke-width={other.id === focusPoint.cenario.id ? 2 : 0}
                />
              {/if}
            {/each}
          </g>
        {/if}

        {#if isSelectionPinned && focusX !== null}
          <ChartSelectionColumnDismiss
            columnCenterX={focusX}
            {columnPitch}
            columnTop={padding.top}
            onDismiss={() => chartSelection.clearSelection()}
          />
        {/if}
      </svg>

      {#if showBreakdownPanel && breakdownPoint}
        {@const { cenario, month } = breakdownPoint}
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
              {month.mes}
              <span class="font-sans text-app-subtle">
                ({formatTimingMonthLabelLong(month.mes)})
              </span>
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

    <ul class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-app-muted">
      {#each cenarios as cenario, i (cenario.id)}
        <li class="flex items-center gap-1.5">
          <span
            class="inline-block h-0.5 w-4 rounded-full"
            style="background: {CHART_COLORS[i % CHART_COLORS.length]}"
          ></span>
          <span class="max-w-[14rem] truncate" title={scenarioLabel(cenario)}>
            {scenarioLabel(cenario)}
          </span>
        </li>
      {/each}
    </ul>
    <p class="mt-2 text-[10px] text-app-subtle">
      Renda mensal menos todos os gastos mensais · clique para selecionar ou desselecionar · linha
      horizontal tracejada: saldo zero · linhas verticais tracejadas: venda · círculo no topo:
      quantia extra · quadrado inferior: reforma concluída
    </p>
  </div>
{/if}
