<script lang="ts">
  import {
    buildMonthGridTicks,
    buildNiceYAxisScale,
    buildXAxisLabelTicks,
    CHART_HEIGHT,
    CHART_PADDING,
    maxMonthlyTotalData,
    monthPitch,
    monthlyTotalAtHover,
    pickChartHoverForTotal,
    polylinePointsForTotal,
    svgCoordsToClient,
    svgPointFromPointer,
    xForMonth,
    yForBalance,
    type ChartHover
  } from "$lib/components/financiamento/debt-timeline-chart-math";
  import ChartHoverBreakdownPanel from "$lib/components/financiamento/ChartHoverBreakdownPanel.svelte";
  import {
    isChartPointerClick,
    resolveTimelineSelection,
    selectionFromTimelinePointer
  } from "$lib/components/financiamento/chart-selection";
  import { getChartSelectionContext } from "$lib/components/financiamento/chart-selection-context.svelte";
  import { renderedFreeBalance, renderedMonthlyTotal } from "$lib/components/financiamento/chart-event-path";
  import {
    formatTimingMonthLabel,
    formatTimingMonthLabelLong
  } from "$lib/components/financiamento/parameter-row-helpers";
  import {
    monthlyExpenseBreakdown
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
    Math.max(1, ...cenarios.flatMap((c) => c.timeline.map((m) => m.mes)), 1)
  );

  const rendaMensal = $derived(cenarios[0]?.rendaMensal ?? 0);

  const yAxis = $derived(
    buildNiceYAxisScale(maxMonthlyTotalData(cenarios, rendaMensal, custoMensal))
  );
  const maxValue = $derived(yAxis.max);

  const rendaY = $derived(yForBalance(rendaMensal, maxValue, height, padding));

  let chartContainer = $state<HTMLDivElement | null>(null);
  let containerWidth = $state(0);

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

  const xMonthGrid = $derived(buildMonthGridTicks(maxMonth, chartWidth, padding));

  const xLabelTicks = $derived(
    buildXAxisLabelTicks(maxMonth, chartWidth, formatTimingMonthLabelLong, padding)
  );

  const yTicks = $derived.by(() =>
    yAxis.ticks.map((value) => ({
      label: formatCurrencyCompact(value),
      y: yForBalance(value, maxValue, height, padding)
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

  let svgEl = $state<SVGSVGElement | null>(null);
  let hover = $state<ChartHover | null>(null);
  let pointerAnchor = $state<{ x: number; y: number } | null>(null);
  let pointerDown = $state<{ x: number; y: number } | null>(null);

  const chartSelection = getChartSelectionContext();

  const hoveredPoint = $derived.by(() => {
    const active = hover;
    if (!active) return null;
    const cenario = cenarios.find((c) => c.id === active.cenarioId);
    if (!cenario) return null;
    const month = cenario.timeline[active.monthIndex];
    if (!month) return null;
    return { cenario, month };
  });

  const selectedPoint = $derived.by(() => {
    if (!chartSelection.selection) return null;
    return resolveTimelineSelection(chartSelection.selection, cenarios);
  });

  const activePoint = $derived(hoveredPoint ?? selectedPoint);
  const activeCenarioId = $derived(hover?.cenarioId ?? chartSelection.selection?.cenarioId ?? null);
  const isSelectionPinned = $derived(!hover && !!selectedPoint);

  const activeX = $derived(
    activePoint
      ? xForMonth(activePoint.month.mes, maxMonth, chartWidth, padding)
      : null
  );

  const activeY = $derived.by(() => {
    if (!activePoint) return null;
    const idx = activePoint.cenario.timeline.findIndex((m) => m.mes === activePoint.month.mes);
    if (idx < 0) return null;
    return yForBalance(
      monthlyTotalAtHover(activePoint.cenario, idx, custoMensal),
      maxValue,
      height,
      padding
    );
  });

  const columnPitch = $derived(monthPitch(plotWidth, maxMonth));

  const breakdownAnchor = $derived.by(() => {
    if (hover) return pointerAnchor;
    if (selectedPoint && svgEl && activeX !== null) {
      return svgCoordsToClient(
        svgEl,
        activeX,
        padding.top + plotHeight / 2,
        chartWidth,
        height
      );
    }
    return null;
  });

  const avoidPoints = $derived.by(() => {
    if (!svgEl || activeX === null || activeY === null) return [];
    return [svgCoordsToClient(svgEl, activeX, activeY, chartWidth, height)];
  });

  function handleChartPointerMove(event: PointerEvent) {
    if (!svgEl) return;
    pointerAnchor = { x: event.clientX, y: event.clientY };
    const { x, y } = svgPointFromPointer(svgEl, event, chartWidth, height);
    const next = pickChartHoverForTotal(
      cenarios,
      x,
      y,
      maxMonth,
      maxValue,
      chartWidth,
      hover,
      custoMensal
    );
    if (
      next &&
      hover &&
      next.cenarioId === hover.cenarioId &&
      next.monthIndex === hover.monthIndex
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
    const pick = pickChartHoverForTotal(
      cenarios,
      x,
      y,
      maxMonth,
      maxValue,
      chartWidth,
      hover,
      custoMensal
    );
    if (!pick) return;
    chartSelection.toggleSelection(selectionFromTimelinePointer(x, pick, maxMonth, chartWidth));
  }

  function handleChartPointerLeave() {
    pointerDown = null;
    pointerAnchor = null;
    hover = null;
  }

  function markerX(month: number | undefined): number | null {
    if (month === undefined) return null;
    return xForMonth(month, maxMonth, chartWidth, padding);
  }
</script>

{#if cenarios.length === 0}
  <p class="px-2 py-6 text-sm text-app-muted sm:px-3">
    Nenhum cenário visível para exibir o gráfico.
  </p>
{:else}
  <header class="border-b border-app-border px-2 py-2 sm:px-3">
    <h3 class="text-sm font-medium text-app-fg">Gasto mensal</h3>
  </header>

  <div class="px-2 py-3 sm:px-3">
    <div bind:this={chartContainer} class="relative w-full">
      <svg
        bind:this={svgEl}
        viewBox="0 0 {chartWidth} {height}"
        class="h-auto w-full select-none touch-none"
        role="img"
        aria-label="Gráfico de total mensal por cenário"
      >
        {#each yTicks as tick}
          <line
            x1={padding.left}
            y1={tick.y}
            x2={chartWidth - padding.right}
            y2={tick.y}
            class="stroke-app-border pointer-events-none"
            stroke-width="1"
            stroke-dasharray="4 4"
          />
          <text
            x={padding.left - 8}
            y={tick.y + 4}
            text-anchor="end"
            class="fill-app-muted pointer-events-none text-[10px]"
          >
            {tick.label}
          </text>
        {/each}

        {#each xMonthGrid as tick}
          <line
            x1={tick.x}
            y1={padding.top}
            x2={tick.x}
            y2={height - padding.bottom}
            class="pointer-events-none stroke-app-border/40"
            stroke-width="1"
          />
        {/each}

        {#each xLabelTicks as tick}
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
          <line
            x1={padding.left}
            y1={rendaY}
            x2={chartWidth - padding.right}
            y2={rendaY}
            class="stroke-app-fg"
            stroke-width="1.5"
            stroke-dasharray="6 4"
            opacity="0.55"
          />
          <text
            x={padding.left - 8}
            y={rendaY + 4}
            text-anchor="end"
            class="fill-app-fg pointer-events-none text-[10px] font-medium"
          >
            Renda
          </text>

          {#each cenarios as cenario, i (cenario.id)}
            {@const color = CHART_COLORS[i % CHART_COLORS.length]}
            {@const points = polylinePointsForTotal(
              cenario,
              maxMonth,
              maxValue,
              chartWidth,
              custoMensal
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

            {#if cenario.timeline.some((m) => m.reformaConcluida)}
              {@const reformMonth = cenario.timeline.find((m) => m.reformaConcluida)?.mes}
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

        {#if activePoint && activeX !== null}
          <g class="pointer-events-none">
            {#if isSelectionPinned}
              <rect
                x={activeX - columnPitch / 2}
                y={padding.top}
                width={columnPitch}
                height={plotHeight}
                fill="var(--color-app-accent)"
                opacity="0.08"
              />
            {/if}
            <line
              x1={activeX}
              y1={padding.top}
              x2={activeX}
              y2={height - padding.bottom}
              stroke={isSelectionPinned
                ? "var(--color-app-accent)"
                : "var(--color-app-border-strong, currentColor)"}
              stroke-width={isSelectionPinned ? 2 : 1}
              class={isSelectionPinned ? "" : "text-app-muted"}
              opacity={isSelectionPinned ? 1 : 0.9}
            />
            {#each cenarios as other, i (other.id)}
              {@const { cenario, month } = activePoint}
              {@const idx = other.timeline.findIndex((m) => m.mes === month.mes)}
              {#if idx >= 0}
                {@const om = other.timeline[idx]}
                {@const ox = xForMonth(om.mes, maxMonth, chartWidth, padding)}
                {@const oy = yForBalance(
                  monthlyTotalAtHover(other, idx, custoMensal),
                  maxValue,
                  height,
                  padding
                )}
                {@const oc = CHART_COLORS[i % CHART_COLORS.length]}
                <circle
                  cx={ox}
                  cy={oy}
                  r={other.id === cenario.id ? 5 : 3}
                  fill={oc}
                  opacity={other.id === cenario.id ? 1 : 0.35}
                  class={other.id === cenario.id ? "stroke-app-surface" : ""}
                  stroke-width={other.id === cenario.id ? 2 : 0}
                />
              {/if}
            {/each}
          </g>
        {/if}
      </svg>

      {#if activePoint}
        {@const { cenario, month } = activePoint}
        {@const gastos = monthlyExpenseBreakdown(month, custoMensal)}
        {@const saldoLivre = renderedFreeBalance(month, cenario.rendaMensal, custoMensal)}
        <ChartHoverBreakdownPanel
          open={!!activePoint}
          anchor={breakdownAnchor}
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
              <dt class="font-bold text-app-accent">Gasto mensal</dt>
              <dd class="font-mono font-bold text-app-accent">
                {formatCurrency(renderedMonthlyTotal(month, custoMensal))}
              </dd>
              <dt>Saldo livre</dt>
              <dd class={cn("font-mono", saldoLivre < 0 ? "text-salmon" : "text-green")}>
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
      <li class="flex items-center gap-1.5">
        <span
          class="inline-block h-0 w-4 border-t border-dashed border-app-fg opacity-55"
        ></span>
        <span>Renda mensal ({formatCurrencyCompact(rendaMensal)})</span>
      </li>
    </ul>
    <p class="mt-2 text-[10px] text-app-subtle">
      Passe o mouse sobre o gráfico para ver cada mês · clique para selecionar ou desselecionar ·
      linha tracejada horizontal: renda mensal · linhas tracejadas verticais: venda · círculo no
      topo: quantia extra · quadrado inferior: reforma concluída
    </p>
  </div>
{/if}
