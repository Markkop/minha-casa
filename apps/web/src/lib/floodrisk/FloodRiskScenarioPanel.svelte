<script lang="ts">
  import { AlertTriangle, CloudRain } from "@lucide/svelte";
  import type { ElementHeight } from "$lib/floodrisk/flood-risk-data";
  import type { FloodRiskGlobals, FloodRiskScenario } from "$lib/floodrisk/flood-risk-scenario";
  import {
    computeLevelRelativeToHouse,
    isWaterAboveHouseFloor,
    scenarioKindBadge,
    shortenScenarioLabel
  } from "$lib/floodrisk/flood-risk-scenario";
  import { cn } from "$lib/utils";

  let {
    scenarios,
    activeScenarioIdx = $bindable(0),
    customBlocks,
    appliedGlobals,
    waterLevel
  }: {
    scenarios: FloodRiskScenario[];
    activeScenarioIdx?: number;
    customBlocks: ElementHeight[];
    appliedGlobals: FloodRiskGlobals | null;
    waterLevel: number;
  } = $props();

  const activeScenario = $derived(scenarios[activeScenarioIdx] ?? null);
  const levelRelativeToHouse = $derived(computeLevelRelativeToHouse(customBlocks, waterLevel));
  const waterAboveHouse = $derived(isWaterAboveHouseFloor(customBlocks, waterLevel));

  function formatRelativeLevel(value: number): string {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)} m`;
  }
</script>

<section class="mb-4">
  <h2 class="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-app-muted">
    <CloudRain class="h-4 w-4" /> Cenarios
  </h2>

  {#if scenarios.length === 0}
    <p
      class="rounded-md border border-dashed border-app-border bg-app-bg p-3 text-sm text-app-muted"
    >
      Cole a resposta da IA para ver os cenarios aqui.
    </p>
  {:else}
    <div class="space-y-2">
      {#each scenarios as scenario, index (scenario.id)}
        {@const badge = scenarioKindBadge(scenario.kind)}
        <button
          type="button"
          class={cn(
            "w-full rounded-md border p-3 text-left transition",
            index === activeScenarioIdx
              ? "border-sky-500 bg-sky-500/10"
              : "border-app-border bg-app-bg hover:bg-app-surface-muted"
          )}
          onclick={() => (activeScenarioIdx = index)}
        >
          <span class="flex items-center justify-between gap-2">
            <span class="flex min-w-0 items-center gap-2">
              <span
                class={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ${badge.className}`}
              >
                {badge.label}
              </span>
              <span class="truncate font-semibold text-app-fg" title={scenario.label}>
                {shortenScenarioLabel(scenario.label)}
              </span>
            </span>
            <span class="shrink-0 font-mono text-xs text-app-muted">{scenario.year}</span>
          </span>
          <span class="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-app-muted">
            <span>{scenario.rain24hMm} mm / 24h</span>
            <span>Rua: {formatRelativeLevel(scenario.waterLevelRelativeToStreet)}</span>
            {#if scenario.confidence}
              <span>Conf.: {scenario.confidence}</span>
            {/if}
          </span>
        </button>
      {/each}
    </div>
  {/if}
</section>

<section class="mb-4 rounded-md border border-app-border bg-app-bg p-3">
  <h2 class="mb-2 text-xs font-bold uppercase tracking-wide text-app-muted">Nivel d'agua</h2>
  <div class="text-3xl font-semibold text-app-fg">{waterLevel.toFixed(2)} m</div>
  {#if activeScenario}
    <p class="mt-1 text-sm text-app-muted">
      Rua: {formatRelativeLevel(activeScenario.waterLevelRelativeToStreet)}
      {#if levelRelativeToHouse != null}
        · Casa: {formatRelativeLevel(levelRelativeToHouse)}
      {/if}
    </p>
    {#if activeScenario.sources}
      <p class="mt-2 text-xs text-app-muted">
        <span class="font-medium text-app-fg">Fontes do cenario:</span>
        {activeScenario.sources}
      </p>
    {/if}
    {#if activeScenario.assumptions}
      <p class="mt-1 text-xs text-app-muted">
        <span class="font-medium text-app-fg">Hipoteses:</span>
        {activeScenario.assumptions}
      </p>
    {/if}
  {/if}
  {#if waterAboveHouse}
    <p
      class="mt-3 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive"
    >
      <AlertTriangle class="h-4 w-4" /> Agua acima do piso da casa.
    </p>
  {/if}
</section>

{#if appliedGlobals?.mainSources && scenarios.length === 0}
  <p class="text-xs text-app-muted">{appliedGlobals.mainSources}</p>
{/if}
