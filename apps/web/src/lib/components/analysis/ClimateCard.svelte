<script lang="ts">
  import ResearchCardShell from "$lib/components/analysis/ResearchCardShell.svelte";
  import type { ClimaSection } from "$lib/property-analysis/types";
  import type { AnalysisStepStatus } from "$lib/property-analysis/step-status";

  let {
    data,
    status,
    onRefresh,
    errorMessage
  }: {
    data?: ClimaSection;
    status: AnalysisStepStatus;
    onRefresh?: () => void;
    errorMessage?: string;
  } = $props();

  const tempRange = $derived(
    data?.temperaturas?.minC != null && data?.temperaturas?.maxC != null
      ? `${data.temperaturas.minC}–${data.temperaturas.maxC}°C`
      : undefined
  );

  const umidRange = $derived(
    data?.umidade?.minPct != null && data?.umidade?.maxPct != null
      ? `${data.umidade.minPct}–${data.umidade.maxPct}%`
      : undefined
  );
</script>

<ResearchCardShell title="Clima" {status} {onRefresh} {errorMessage}>
  {#if data?.skipped}
    <p class="text-sm text-app-muted">{data.reason ?? "Clima indisponível."}</p>
  {:else if data}
    <div class="space-y-3">
      {#if data.resumo}
        <p class="text-sm leading-relaxed text-app-fg">{data.resumo}</p>
      {/if}
      <div class="border-t border-app-border pt-2 first:border-t-0 first:pt-0">
        <p class="text-xs font-medium text-app-muted">Temperaturas</p>
        {#if tempRange}
          <p class="mt-0.5 text-sm font-medium text-app-fg">{tempRange}</p>
        {/if}
        {#if data.temperaturas?.descricao}
          <p class="mt-1 text-sm text-app-fg/90">{data.temperaturas.descricao}</p>
        {/if}
      </div>
      <div class="border-t border-app-border pt-2">
        <p class="text-xs font-medium text-app-muted">Umidade</p>
        {#if umidRange}
          <p class="mt-0.5 text-sm font-medium text-app-fg">{umidRange}</p>
        {/if}
        {#if data.umidade?.descricao}
          <p class="mt-1 text-sm text-app-fg/90">{data.umidade.descricao}</p>
        {/if}
      </div>
      <div class="border-t border-app-border pt-2">
        <p class="text-xs font-medium text-app-muted">Chuva</p>
        {#if data.chuva?.mmAnualEstimado != null}
          <p class="mt-0.5 text-sm font-medium text-app-fg">
            ~{data.chuva.mmAnualEstimado} mm/ano
          </p>
        {/if}
        {#if data.chuva?.descricao}
          <p class="mt-1 text-sm text-app-fg/90">{data.chuva.descricao}</p>
        {/if}
      </div>
    </div>
  {/if}
</ResearchCardShell>
