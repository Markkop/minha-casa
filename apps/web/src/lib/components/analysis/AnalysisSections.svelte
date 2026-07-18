<script lang="ts">
  import ResearchCardsGrid from "$lib/components/analysis/ResearchCardsGrid.svelte";
  import AmbientesPanel from "$lib/components/property-details/AmbientesPanel.svelte";
  import { resolveListingImages } from "$lib/listing-images";
  import { isLegacyAnalysisResult } from "$lib/property-analysis/stale-result";
  import { isListingAnalysisV6 } from "$lib/property-analysis/types";
  import type {
    ListingAnalysisPipelineStep,
    ListingAnalysisResult
  } from "$lib/property-analysis/types";
  import type { Property } from "$lib/listings/types";
  import { cn } from "$lib/utils";

  let {
    result,
    isRunning,
    listing = null,
    class: className = "",
    onRetryStep,
    onRetryAmbienteXray
  }: {
    result: ListingAnalysisResult | null;
    isRunning: boolean;
    listing?: Property | null;
    class?: string;
    onRetryStep?: (step: ListingAnalysisPipelineStep) => void;
    onRetryAmbienteXray?: (ambienteId: string) => void;
  } = $props();

  const listingImageUrls = $derived(
    listing
      ? resolveListingImages({
          listingId: listing.id,
          imageUrl: listing.imageUrl,
          imageUrls: listing.imageUrls,
          imageStorageKeys: listing.imageStorageKeys
        }).imageUrls
      : []
  );
</script>

{#if !result && !isRunning}
  <p class={cn("text-sm text-app-muted", className)}>
    Inicie a análise profunda para ver resultados aqui.
  </p>
{:else if result && isLegacyAnalysisResult(result)}
  <p
    class={cn(
      "rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950",
      className
    )}
    role="status"
  >
    Análise antiga (formato anterior). Clique em <strong>Executar nova análise</strong> para
    gerar o relatório atualizado.
  </p>
{:else if result && !isListingAnalysisV6(result) && !isRunning}
  <!-- non-v6 result while idle -->
{:else}
  <div class={cn("space-y-6", className)}>
    <ResearchCardsGrid {result} {isRunning} {listing} {onRetryStep} />
    <AmbientesPanel
      {result}
      {isRunning}
      imageUrls={listingImageUrls}
      {onRetryStep}
      {onRetryAmbienteXray}
    />
  </div>
{/if}
