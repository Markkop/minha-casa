<script lang="ts">
  import { Loader2, ScanSearch } from "@lucide/svelte";
  import type { Property } from "$lib/listings/types";
  import Button from "$lib/components/ui/Button.svelte";
  import WorkspacePanel from "$lib/components/workspace/WorkspacePanel.svelte";
  import AnalysisSections from "$lib/components/analysis/AnalysisSections.svelte";
  import { hasGeocodableAddress } from "$lib/components/analysis/has-geocodable-address";
  import { createPropertyAnalysis } from "$lib/property-analysis/use-property-analysis.svelte";
  import { isLegacyAnalysisResult, isStaleConfigResult } from "$lib/property-analysis/stale-result";
  import { cn } from "$lib/utils";

  let {
    listing,
    orgId = null,
    readOnly = false
  }: {
    listing: Property;
    orgId?: string | null;
    readOnly?: boolean;
  } = $props();

  const analysisState = createPropertyAnalysis(
    () => listing.id,
    () => orgId
  );

  let addressOverride = $state("");
  let skipAddress = $state(false);

  const needsAddress = $derived(!hasGeocodableAddress(listing));

  const staleResult = $derived(
    analysisState.analysis?.status === "completed" &&
      isStaleConfigResult(analysisState.analysis.result ?? null)
  );

  const legacyResult = $derived(
    analysisState.analysis?.result != null &&
      isLegacyAnalysisResult(analysisState.analysis.result)
  );

  function handleRun() {
    const override = needsAddress && !skipAddress ? addressOverride.trim() : undefined;
    void analysisState.runAnalysis(override || undefined);
  }
</script>

<div class="space-y-4">
  <WorkspacePanel class="p-4">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 class="flex items-center gap-2 text-base font-semibold text-app-fg">
          <ScanSearch class="size-4" />
          Análise profunda
        </h2>
        <p class="mt-1 max-w-xl text-sm text-app-muted">
          Pesquisa de clima, riscos naturais e mercado; reconhecimento dos ambientes pelas fotos;
          estimativa de idade e orçamento por ponto de atenção. Os cards aparecem conforme cada etapa
          termina.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button type="button" onclick={handleRun} disabled={readOnly || analysisState.isStarting || analysisState.isRunning}>
          {#if analysisState.isStarting || analysisState.isRunning}
            <Loader2 class="size-4 animate-spin" />
          {/if}
          {analysisState.isRunning
            ? "Analisando..."
            : analysisState.analysis?.status === "completed"
              ? "Executar nova análise"
              : "Iniciar análise profunda"}
        </Button>
        {#if analysisState.analysis}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onclick={() => void analysisState.refresh(analysisState.analysis!.id)}
            disabled={readOnly || analysisState.isLoading}
          >
            Atualizar
          </Button>
        {/if}
      </div>
    </div>

    {#if needsAddress}
      <div class="mt-4 rounded-lg border border-app-border bg-app-bg p-3">
        <p class="text-xs text-app-muted">
          Sem endereço ou coordenadas — a busca de proximidades será limitada. Informe um endereço
          completo ou continue sem.
        </p>
        <div class="mt-2 flex flex-wrap items-end gap-3">
          <div class="min-w-[200px] flex-1">
            <label for="address-override" class="text-xs">Endereço (opcional)</label>
            <input
              id="address-override"
              bind:value={addressOverride}
              placeholder="Rua, número, bairro, cidade"
              class="mt-1 h-8 w-full rounded-md border border-app-border bg-white px-3 text-sm"
              disabled={readOnly || skipAddress}
            />
          </div>
          <label class="flex items-center gap-2 text-xs text-app-muted">
            <input
              type="checkbox"
              bind:checked={skipAddress}
              disabled={readOnly}
              class="rounded border-app-border"
            />
            Continuar sem endereço
          </label>
        </div>
      </div>
    {/if}

    {#if (staleResult || legacyResult) && !analysisState.isRunning}
      <p class="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950" role="status">
        {#if legacyResult}
          Este resultado usa o formato antigo da análise.
        {:else}
          Este resultado foi gerado antes das chaves de API estarem ativas no servidor.
        {/if}
        Clique em <strong>Executar nova análise</strong> para refazer.
      </p>
    {/if}

    {#if analysisState.error}
      <p class="mt-3 text-sm text-destructive" role="alert">{analysisState.error}</p>
    {/if}

    {#if analysisState.analysis?.status === "failed" && analysisState.analysis.error}
      <p class="mt-3 text-sm text-destructive">{analysisState.analysis.error}</p>
    {/if}
  </WorkspacePanel>

  <AnalysisSections
    result={analysisState.analysis?.result ?? null}
    isRunning={analysisState.isRunning}
    {listing}
    class={cn(analysisState.isLoading && !analysisState.analysis && "opacity-60")}
    onRetryStep={readOnly ? undefined : (step) => void analysisState.retryStep(step)}
    onRetryAmbienteXray={readOnly ? undefined : (ambienteId) => void analysisState.retryAmbienteXray(ambienteId)}
  />
</div>
