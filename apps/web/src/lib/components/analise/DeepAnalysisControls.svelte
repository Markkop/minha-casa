<script lang="ts">
  import { Loader2, ScanSearch } from "@lucide/svelte";
  import type { Imovel } from "$lib/anuncios/types";
  import Button from "$lib/components/ui/Button.svelte";
  import WorkspacePanel from "$lib/components/workspace/WorkspacePanel.svelte";
  import { hasGeocodableAddress } from "$lib/components/analise/has-geocodable-address";
  import { isLegacyAnalysisResult, isStaleConfigResult } from "$lib/property-analysis/stale-result";
  import type { ListingAnalysis } from "$lib/property-analysis/types";

  let {
    listing,
    analysis = null,
    isLoading = false,
    isStarting = false,
    isRunning = false,
    error = null,
    onRun,
    onRefresh
  }: {
    listing: Imovel;
    analysis?: ListingAnalysis | null;
    isLoading?: boolean;
    isStarting?: boolean;
    isRunning?: boolean;
    error?: string | null;
    onRun: (addressOverride?: string) => void;
    onRefresh?: (analysisId: string) => void;
  } = $props();

  let addressOverride = $state("");
  let skipAddress = $state(false);

  const needsAddress = $derived(!hasGeocodableAddress(listing));

  const staleResult = $derived(
    analysis?.status === "completed" && isStaleConfigResult(analysis.result ?? null)
  );

  const legacyResult = $derived(
    analysis?.result != null && isLegacyAnalysisResult(analysis.result)
  );

  function handleRun() {
    const override = needsAddress && !skipAddress ? addressOverride.trim() : undefined;
    onRun(override || undefined);
  }
</script>

<WorkspacePanel class="p-4">
  <div class="flex flex-wrap items-start justify-between gap-4">
    <div>
      <h2 class="flex items-center gap-2 text-base font-semibold text-app-fg">
        <ScanSearch class="size-4" />
        Análise profunda
      </h2>
      <p class="mt-1 max-w-xl text-sm text-app-muted">
        Pesquisa de clima, riscos naturais, mercado e estimativa de idade do imóvel.
      </p>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <Button type="button" onclick={handleRun} disabled={isStarting || isRunning}>
        {#if isStarting || isRunning}
          <Loader2 class="size-4 animate-spin" />
        {/if}
        {isRunning
          ? "Analisando..."
          : analysis?.status === "completed"
            ? "Executar nova análise"
            : "Iniciar análise profunda"}
      </Button>
      {#if analysis && onRefresh}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onclick={() => onRefresh(analysis.id)}
          disabled={isLoading}
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
            disabled={skipAddress}
          />
        </div>
        <label class="flex items-center gap-2 text-xs text-app-muted">
          <input type="checkbox" bind:checked={skipAddress} class="rounded border-app-border" />
          Continuar sem endereço
        </label>
      </div>
    </div>
  {/if}

  {#if (staleResult || legacyResult) && !isRunning}
    <p class="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950" role="status">
      {#if legacyResult}
        Este resultado usa o formato antigo da análise.
      {:else}
        Este resultado foi gerado antes das chaves de API estarem ativas no servidor.
      {/if}
      Clique em <strong>Executar nova análise</strong> para refazer.
    </p>
  {/if}

  {#if error}
    <p class="mt-3 text-sm text-destructive" role="alert">{error}</p>
  {/if}

  {#if analysis?.status === "failed" && analysis.error}
    <p class="mt-3 text-sm text-destructive">{analysis.error}</p>
  {/if}
</WorkspacePanel>
