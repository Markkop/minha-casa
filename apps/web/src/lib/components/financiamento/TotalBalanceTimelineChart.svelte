<script lang="ts">
  import {
    buildMonthGridTicks,
    buildXAxisLabelTicks,
    CHART_HEIGHT,
    CHART_PADDING,
    monthPitch,
    svgCoordsToClient,
    svgPointFromPointer,
    type ChartHover
  } from "$lib/components/financiamento/debt-timeline-chart-math";
  import ChartHoverBreakdownPanel from "$lib/components/financiamento/ChartHoverBreakdownPanel.svelte";
  import {
    isChartPointerClick,
    mesFromLedgerHover,
    resolveLedgerSelection
  } from "$lib/components/financiamento/chart-selection";
  import { getChartSelectionContext } from "$lib/components/financiamento/chart-selection-context.svelte";
  import {
    buildBalanceLedgers,
    buildSignedYAxisScale,
    pickLedgerHover,
    polylinePointsForLedger,
    xForLedgerMonth,
    yForLedgerValue
  } from "$lib/components/financiamento/total-balance-ledger";
  import {
    formatTimingMonthLabel,
    formatTimingMonthLabelLong
  } from "$lib/components/financiamento/parameter-row-helpers";
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
  const ledgers = $derived(
    buildBalanceLedgers(cenarios, capitalDisponivel, quantiaExtra, custoMensal)
  );
  const maxMonth = $derived(
    Math.max(1, ...ledgers.flatMap((series) => series.points.map((point) => point.mes)))
  );
  const yAxis = $derived(
    buildSignedYAxisScale(ledgers.flatMap((series) => series.points.map((point) => point.saldo)))
  );

  let chartContainer = $state<HTMLDivElement | null>(null);
  let containerWidth = $state(0);
  let svgEl = $state<SVGSVGElement | null>(null);
  let hover = $state<ChartHover | null>(null);
  let pointerAnchor = $state<{ x: number; y: number } | null>(null);
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
    if (!hover) return null;
    const series = ledgers.find((item) => item.cenario.id === hover?.cenarioId);
    const point = series?.points[hover.monthIndex];
    return series && point ? { series, point } : null;
  });

  const selectedPoint = $derived.by(() => {
    if (!chartSelection.selection) return null;
    return resolveLedgerSelection(chartSelection.selection, ledgers);
  });

  const activePoint = $derived(hoveredPoint ?? selectedPoint);
  const activeCenarioId = $derived(hover?.cenarioId ?? chartSelection.selection?.cenarioId ?? null);
  const isSelectionPinned = $derived(!hover && !!selectedPoint);

  const activeX = $derived(
    activePoint
      ? xForLedgerMonth(activePoint.point.mes, maxMonth, chartWidth, padding)
      : null
  );

  const activeY = $derived(
    activePoint
      ? yForLedgerValue(activePoint.point.saldo, yAxis, height, padding)
      : null
  );

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

  const zeroY = $derived(yForLedgerValue(0, yAxis, height, padding));
  const xMonthGrid = $derived(buildMonthGridTicks(maxMonth, chartWidth, padding));
  const xLabelTicks = $derived(
    buildXAxisLabelTicks(maxMonth, chartWidth, formatTimingMonthLabelLong, padding).map((tick) => ({
      ...tick,
      x: xForLedgerMonth(tick.month, maxMonth, chartWidth, padding)
    }))
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
    pointerAnchor = { x: event.clientX, y: event.clientY };
    const { x, y } = svgPointFromPointer(svgEl, event, chartWidth, height);
    hover = pickLedgerHover(ledgers, x, y, maxMonth, yAxis, chartWidth, hover);
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
    pointerAnchor = null;
    hover = null;
  }

  function markerX(month: number | undefined): number | null {
    return month === undefined
      ? null
      : xForLedgerMonth(month, maxMonth, chartWidth, padding);
  }
</script>

{#if cenarios.length === 0}
  <p class="px-2 py-6 text-sm text-app-muted sm:px-3">
    Nenhum cenário visível para exibir o gráfico.
  </p>
{:else}
  <header class="border-b border-app-border px-2 py-2 sm:px-3">
    <h3 class="text-sm font-medium text-app-fg">Saldo total ao longo do tempo</h3>
  </header>

  <div class="px-2 py-3 sm:px-3">
    <div bind:this={chartContainer} class="relative w-full">
      <svg
        bind:this={svgEl}
        viewBox="0 0 {chartWidth} {height}"
        class="h-auto w-full select-none touch-none"
        role="img"
        aria-label="Gráfico de saldo total disponível por cenário"
      >
        {#each yTicks as tick}
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
            text-anchor={tick.month === 0 ? "start" : "middle"}
            class={cn(
              "pointer-events-none text-[10px]",
              tick.kind === "year" ? "fill-app-fg font-medium" : "fill-app-subtle"
            )}
          >
            {tick.label}
          </text>
        {/each}

        <g class="pointer-events-none">
          {#each ledgers as series, i (series.cenario.id)}
            {@const color = CHART_COLORS[i % CHART_COLORS.length]}
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

            {#if series.cenario.vendaEm}
              {@const mx = markerX(series.cenario.vendaEm)}
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

            {#if series.cenario.extraEm}
              {@const mx = markerX(series.cenario.extraEm)}
              {#if mx !== null}
                <circle cx={mx} cy={padding.top + 6} r="4" fill={color} class="opacity-80" />
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
            {#each ledgers as other, i (other.cenario.id)}
              {@const point = other.points.find((item) => item.mes === activePoint.point.mes)}
              {#if point}
                <circle
                  cx={xForLedgerMonth(point.mes, maxMonth, chartWidth, padding)}
                  cy={yForLedgerValue(point.saldo, yAxis, height, padding)}
                  r={other.cenario.id === activePoint.series.cenario.id ? 5 : 3}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                  opacity={other.cenario.id === activePoint.series.cenario.id ? 1 : 0.35}
                  class={other.cenario.id === activePoint.series.cenario.id
                    ? "stroke-app-surface"
                    : ""}
                  stroke-width={other.cenario.id === activePoint.series.cenario.id ? 2 : 0}
                />
              {/if}
            {/each}
          </g>
        {/if}
      </svg>

      {#if activePoint}
        {@const { series, point } = activePoint}
        <ChartHoverBreakdownPanel
          open={!!activePoint}
          anchor={breakdownAnchor}
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
      Saldo disponível após entrada, fechamento, renda e despesas · clique para selecionar ou
      desselecionar · linha horizontal tracejada: saldo zero · linhas verticais tracejadas: venda ·
      círculo no topo: quantia extra
    </p>
  </div>
{/if}
