<script lang="ts">
  import ClimateCard from "$lib/components/analise/ClimateCard.svelte";
  import NaturalRisksCard from "$lib/components/analise/NaturalRisksCard.svelte";
  import MarketCard from "$lib/components/analise/MarketCard.svelte";
  import PropertyAgeCard from "$lib/components/analise/PropertyAgeCard.svelte";
  import type { Imovel } from "$lib/anuncios/types";
  import { analysisStepStatus } from "$lib/property-analysis/step-status";
  import type {
    ListingAnalysisPipelineStep,
    ListingAnalysisResult
  } from "$lib/property-analysis/types";

  let {
    result,
    isRunning,
    listing = null,
    onRetryStep
  }: {
    result: ListingAnalysisResult | null;
    isRunning: boolean;
    listing?: Imovel | null;
    onRetryStep?: (step: ListingAnalysisPipelineStep) => void;
  } = $props();

  function stepError(step: ListingAnalysisPipelineStep): string | undefined {
    return result?.stepErrors?.[step]?.reason;
  }

  function refresh(step: ListingAnalysisPipelineStep): (() => void) | undefined {
    return onRetryStep ? () => onRetryStep(step) : undefined;
  }
</script>

<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
  <ClimateCard
    data={result?.clima}
    status={analysisStepStatus("clima", result, isRunning)}
    onRefresh={refresh("clima")}
    errorMessage={stepError("clima")}
  />
  <NaturalRisksCard
    data={result?.riscos}
    status={analysisStepStatus("riscos", result, isRunning)}
    onRefresh={refresh("riscos")}
    errorMessage={stepError("riscos")}
  />
  <MarketCard
    data={result?.mercado}
    status={analysisStepStatus("mercado", result, isRunning)}
    onRefresh={refresh("mercado")}
    errorMessage={stepError("mercado")}
  />
  <PropertyAgeCard
    data={result?.idade}
    constructionYear={listing?.anoConstrucao ?? null}
    status={analysisStepStatus("idade", result, isRunning)}
    onRefresh={refresh("idade")}
    errorMessage={stepError("idade")}
  />
</div>
