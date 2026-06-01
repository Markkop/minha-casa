<script lang="ts">
  import ResearchCardShell from "$lib/components/analise/ResearchCardShell.svelte";
  import type { IdadeSection } from "$lib/property-analysis/types";
  import type { AnalysisStepStatus } from "$lib/property-analysis/step-status";

  let {
    data,
    status,
    onRefresh,
    errorMessage
  }: {
    data?: IdadeSection;
    status: AnalysisStepStatus;
    onRefresh?: () => void;
    errorMessage?: string;
  } = $props();

  const waitingAmbientes = $derived(status === "waiting");
</script>

<ResearchCardShell title="Idade do Imóvel" {status} {onRefresh} {errorMessage}>
  {#if waitingAmbientes}
    <p class="text-sm text-app-muted">Aguardando reconhecimento dos ambientes…</p>
  {:else if data?.skipped}
    <p class="text-sm text-app-muted">{data.reason ?? "Estimativa indisponível."}</p>
  {:else if data}
    <div class="space-y-2">
      {#if data.estimativaAnos != null || data.faixaAnos}
        <p class="text-sm font-medium text-app-fg">
          {#if data.estimativaAnos != null}~{data.estimativaAnos} anos{/if}
          {#if data.faixaAnos}
            ({data.faixaAnos.min}–{data.faixaAnos.max} anos)
          {/if}
        </p>
      {/if}
      {#if data.resumo}
        <p class="text-sm leading-relaxed text-app-fg">{data.resumo}</p>
      {/if}
      {#if data.sinaisVistos && data.sinaisVistos.length > 0}
        <ul class="list-inside list-disc text-xs text-app-muted">
          {#each data.sinaisVistos as sinal (sinal)}
            <li>{sinal}</li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
</ResearchCardShell>
