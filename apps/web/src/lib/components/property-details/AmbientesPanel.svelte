<script lang="ts">
  import { Loader2, RefreshCw } from "@lucide/svelte";
  import WorkspacePanel from "$lib/components/workspace/WorkspacePanel.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import AmbienteCard from "$lib/components/property-details/AmbienteCard.svelte";
  import UnassignedPhotosCard from "$lib/components/property-details/UnassignedPhotosCard.svelte";
  import { formatBrl, truncateError } from "$lib/components/analysis/format-brl";
  import { analysisStepStatus } from "$lib/property-analysis/step-status";
  import type {
    ListingAnalysisPipelineStep,
    ListingAnalysisResult
  } from "$lib/property-analysis/types";
  import { sumAmbienteXrayTotals } from "$lib/property-analysis/types";
  import { cn } from "$lib/utils";

  let {
    result,
    isRunning,
    imageUrls,
    class: className = "",
    onRetryStep,
    onRetryAmbienteXray
  }: {
    result: ListingAnalysisResult | null;
    isRunning: boolean;
    imageUrls: string[];
    class?: string;
    onRetryStep?: (step: ListingAnalysisPipelineStep) => void;
    onRetryAmbienteXray?: (ambienteId: string) => void;
  } = $props();

  const status = $derived(analysisStepStatus("ambientes", result, isRunning));
  const ambientes = $derived(result?.ambientes);
  const cards = $derived(ambientes?.cards ?? []);
  const semCategoria = $derived(ambientes?.semCategoria?.imageIndices ?? []);
  const ambientesError = $derived(result?.stepErrors?.ambientes?.reason);
  const totals = $derived(sumAmbienteXrayTotals(cards));
  const hasTotals = $derived(totals.totalMinBrl > 0 || totals.totalMaxBrl > 0);
</script>

<div class={cn("space-y-3", className)}>
  <WorkspacePanel class="p-4">
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-1">
          <h3 class="text-base font-semibold text-app-fg">Ambientes</h3>
          {#if onRetryStep}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="size-7 text-app-muted hover:text-app-fg"
              ariaLabel="Reexecutar reconhecimento de ambientes"
              disabled={status === "pending"}
              onclick={() => onRetryStep("ambientes")}
            >
              <RefreshCw class="size-3.5" />
            </Button>
          {/if}
        </div>
        <p class="mt-1 text-sm text-app-muted">
          Reconhecimento por foto: inventário por ambiente e x-ray com pontos de atenção e
          orçamento por card.
        </p>
        {#if status === "failed" && ambientesError}
          <p class="mt-1 text-xs text-destructive" title={ambientesError}>
            {truncateError(ambientesError)}
          </p>
        {/if}
      </div>
      <div class="flex shrink-0 flex-col items-end gap-1">
        {#if status === "pending"}
          <span class="inline-flex items-center gap-1 text-xs text-app-muted">
            <Loader2 class="size-3.5 animate-spin" />
            Processando…
          </span>
        {:else if status === "done"}
          <span class="text-xs font-medium text-emerald-700 dark:text-emerald-400">Pronto</span>
        {:else if status === "failed"}
          <span class="text-xs font-medium text-destructive">Falhou</span>
        {/if}
      </div>
    </div>
    {#if ambientes?.resumoGeral}
      <p class="mt-3 text-sm leading-relaxed text-app-fg">{ambientes.resumoGeral}</p>
    {/if}
    {#if hasTotals}
      <p class="mt-2 text-xs text-app-muted">
        Total estimado (x-ray):
        <span class="font-medium text-app-fg">
          {formatBrl(totals.totalMinBrl)} – {formatBrl(totals.totalMaxBrl)}
        </span>
      </p>
    {/if}
  </WorkspacePanel>

  {#if (status === "pending" || status === "waiting") && cards.length === 0}
    <div class="columns-1 gap-3 sm:columns-2 lg:columns-3">
      {#each [1, 2, 3, 4, 5, 6] as i (i)}
        <div class="mb-3 break-inside-avoid">
          <div class="h-48 animate-pulse rounded-lg bg-app-surface-muted"></div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="columns-1 gap-3 sm:columns-2 lg:columns-3">
      {#each cards as card (card.id)}
        <div class="mb-3 break-inside-avoid">
          <AmbienteCard
            {card}
            {imageUrls}
            onRefreshXray={onRetryAmbienteXray ? () => onRetryAmbienteXray(card.id) : undefined}
          />
        </div>
      {/each}
      <div class="mb-3 break-inside-avoid">
        <UnassignedPhotosCard imageIndices={semCategoria} {imageUrls} />
      </div>
    </div>
  {/if}
</div>
