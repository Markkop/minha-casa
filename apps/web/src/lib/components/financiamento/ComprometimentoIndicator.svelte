<script lang="ts">
  import {
    formatPercent,
    generateTooltips,
    type ComprometimentoRendaResult
  } from "$lib/financiamento/calculations";
  import Tooltip from "$lib/components/ui/Tooltip.svelte";
  import { cn } from "$lib/utils";

  const defaultTooltips = generateTooltips();

  let { comprometimento }: { comprometimento: ComprometimentoRendaResult } = $props();

  const { percentual, dentroDoLimite } = $derived(comprometimento);
</script>

<Tooltip side="top">
  {#snippet trigger()}
    <div class="flex items-center gap-2">
      <div class="h-2 flex-1 overflow-hidden rounded-full bg-app-surface-muted">
        <div
          class={cn("h-full transition-all", dentroDoLimite ? "bg-green" : "bg-salmon")}
          style="width: {Math.min(percentual * 100, 100)}%"
        ></div>
      </div>
      <span class={cn("font-mono text-xs", dentroDoLimite ? "text-green" : "text-salmon")}>
        {formatPercent(percentual)}
      </span>
    </div>
  {/snippet}
  <p class="text-xs">{defaultTooltips.comprometimento}</p>
  {#if !dentroDoLimite}
    <p class="mt-1 text-xs text-salmon">Acima do limite de 30%. Pode dificultar aprovação.</p>
  {/if}
</Tooltip>
