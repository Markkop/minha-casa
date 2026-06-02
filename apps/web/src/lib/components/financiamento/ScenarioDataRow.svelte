<script lang="ts">
  import { Info } from "@lucide/svelte";
  import Tooltip from "$lib/components/ui/Tooltip.svelte";
  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";

  let {
    label,
    value,
    valueContent,
    tooltip,
    highlight = false,
    class: className = ""
  }: {
    label: string;
    value?: string;
    valueContent?: Snippet;
    tooltip?: string;
    highlight?: boolean;
    class?: string;
  } = $props();
</script>

<div
  class={cn(
    "flex items-center justify-between py-1",
    highlight && "-mx-2 rounded bg-app-action/5 px-2",
    className
  )}
>
  <div class="flex items-center gap-1">
    <span class="text-xs text-app-muted">{label}</span>
    {#if tooltip}
      <Tooltip side="top" wrap={true} text={tooltip}>
        {#snippet trigger()}
          <button
            type="button"
            class="inline-flex text-app-subtle hover:text-app-accent"
            aria-label={`Informação: ${label}`}
          >
            <Info class="size-3" />
          </button>
        {/snippet}
        <p class="max-w-xs text-xs">{tooltip}</p>
      </Tooltip>
    {/if}
  </div>
  {#if value !== undefined}
    <span class={cn("font-mono text-sm", highlight ? "font-bold text-app-accent" : "text-app-fg")}>
      {value}
    </span>
  {:else if valueContent}
    <div class={cn("font-mono text-sm", highlight ? "font-bold text-app-accent" : "text-app-fg")}>
      {@render valueContent()}
    </div>
  {/if}
</div>
