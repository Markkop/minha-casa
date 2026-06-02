<script lang="ts">
  import ResearchCardShell from "$lib/components/analise/ResearchCardShell.svelte";
  import type { RiscosSection } from "$lib/property-analysis/types";
  import type { AnalysisStepStatus } from "$lib/property-analysis/step-status";

  let {
    data,
    status,
    onRefresh,
    errorMessage
  }: {
    data?: RiscosSection;
    status: AnalysisStepStatus;
    onRefresh?: () => void;
    errorMessage?: string;
  } = $props();
</script>

<ResearchCardShell title="Riscos Naturais" {status} {onRefresh} {errorMessage}>
  {#if data?.skipped}
    <p class="text-sm text-app-muted">{data.reason ?? "Riscos indisponíveis."}</p>
  {:else if data?.paragrafo}
    <div class="space-y-2">
      <p class="text-sm leading-relaxed text-app-fg">{data.paragrafo}</p>
      {#if data.tags && data.tags.length > 0}
        <div class="flex flex-wrap gap-1">
          {#each data.tags as tag (tag)}
            <span
              class="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-900 dark:text-amber-100"
            >
              {tag}
            </span>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</ResearchCardShell>
