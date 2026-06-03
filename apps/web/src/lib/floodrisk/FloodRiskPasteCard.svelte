<script lang="ts">
  import type { FieldSummary, FloodRiskGlobals } from "$lib/floodrisk/flood-risk-scenario";
  import type { ParseResult } from "$lib/floodrisk/flood-risk-parser";
  import { RECOMMENDED_SCENARIO_COUNT } from "$lib/floodrisk/flood-risk-data";

  let {
    pastedText = $bindable(""),
    parseResult,
    appliedGlobals,
    scenarioCount = 0
  }: {
    pastedText?: string;
    parseResult: ParseResult | null;
    appliedGlobals: FloodRiskGlobals | null;
    scenarioCount?: number;
  } = $props();

  const status = $derived.by(() => {
    if (!pastedText.trim()) {
      return { label: "Aguardando", className: "bg-app-surface-muted text-app-muted" };
    }
    if (parseResult?.ok) {
      return { label: "Valido", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" };
    }
    return { label: "Erro", className: "border-destructive/30 bg-destructive/10 text-destructive" };
  });

  const summary = $derived(parseResult?.ok ? parseResult.summary : []);
  const showFewScenariosWarning = $derived(
    parseResult?.ok === true && scenarioCount > 0 && scenarioCount < RECOMMENDED_SCENARIO_COUNT
  );
</script>

<section class="flex min-h-[220px] flex-col rounded-lg border border-app-border bg-app-surface p-4 shadow-sm">
  <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
    <div>
      <h2 class="text-sm font-semibold text-app-fg">Resposta da IA</h2>
      <p class="mt-0.5 text-xs text-app-muted">Cole o texto no formato #CAMPO=valor.</p>
    </div>
    <span
      class={`rounded-full border border-app-border px-2.5 py-1 text-xs font-semibold ${status.className}`}
    >
      {status.label}
    </span>
  </div>

  <textarea
    class="min-h-[120px] w-full resize-y rounded-md border border-app-border bg-app-bg p-3 font-mono text-xs text-app-fg"
    bind:value={pastedText}
    placeholder="#LATITUDE=...&#10;#SCENARIO_START&#10;#SCENARIO_KIND=current&#10;..."
  ></textarea>

  {#if parseResult && !parseResult.ok}
    <p class="mt-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
      {parseResult.error}
      {#if parseResult.line}
        <span class="mt-1 block opacity-80">Linha {parseResult.line}</span>
      {/if}
    </p>
  {/if}

  {#if showFewScenariosWarning}
    <p class="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-800">
      Menos de {RECOMMENDED_SCENARIO_COUNT} cenarios recomendados. A visualizacao ainda funciona.
    </p>
  {/if}

  {#if summary.length > 0}
    <ul class="mt-3 space-y-1 text-xs text-app-fg">
      {#each summary as item (item.field)}
        <li class="flex justify-between gap-2 border-b border-app-border pb-1">
          <span class="text-app-muted">{item.field}</span>
          <span class="text-right font-mono">{item.value}</span>
        </li>
      {/each}
    </ul>
  {/if}

  {#if appliedGlobals && (appliedGlobals.mainSources || appliedGlobals.assumptions || appliedGlobals.warnings)}
    <div class="mt-3 space-y-2 border-t border-app-border pt-3 text-xs text-app-muted">
      {#if appliedGlobals.mainSources}
        <p><span class="font-semibold text-app-fg">Fontes:</span> {appliedGlobals.mainSources}</p>
      {/if}
      {#if appliedGlobals.assumptions}
        <p><span class="font-semibold text-app-fg">Hipoteses:</span> {appliedGlobals.assumptions}</p>
      {/if}
      {#if appliedGlobals.warnings}
        <p><span class="font-semibold text-amber-800">Avisos:</span> {appliedGlobals.warnings}</p>
      {/if}
    </div>
  {/if}
</section>
