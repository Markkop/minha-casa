<script lang="ts">
  import type { CenarioCompleto } from "$lib/financiamento/calculations";
  import { resolveAporteStartMonth } from "$lib/financiamento/aporte-progressivo";

  type ChartPadding = {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };

  let {
    cenario,
    color,
    markerX,
    padding,
    height,
    showReformMarker = true
  }: {
    cenario: CenarioCompleto;
    color: string;
    markerX: (month: number | undefined) => number | null;
    padding: ChartPadding;
    height: number;
    showReformMarker?: boolean;
  } = $props();
</script>

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

{#if cenario.aporteEm !== undefined && cenario.aporteEm > 0}
  {@const mx = markerX(resolveAporteStartMonth(cenario.aporteEm))}
  {#if mx !== null}
    <line
      x1={mx}
      y1={padding.top}
      x2={mx}
      y2={height - padding.bottom}
      stroke={color}
      stroke-width="1"
      stroke-dasharray="1 4"
      opacity="0.35"
    />
  {/if}
{/if}

{#if showReformMarker && cenario.timeline.some((month) => month.reformaConcluida)}
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
