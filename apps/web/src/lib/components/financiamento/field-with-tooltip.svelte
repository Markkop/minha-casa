<script lang="ts">
  import { Info } from "@lucide/svelte";
  import Label from "$lib/components/ui/Label.svelte";
  import FloatingTooltip from "$lib/components/ui/FloatingTooltip.svelte";
  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";

  let {
    label,
    tooltip,
    class: className = "",
    children
  }: {
    label: string;
    tooltip?: string;
    class?: string;
    children: Snippet;
  } = $props();
</script>

<div class={cn("space-y-2", className)}>
  <div class="flex items-center gap-2">
    <Label class="text-sm text-app-muted">{label}</Label>
    {#if tooltip}
      <FloatingTooltip label={tooltip} side="top" align="center" class="max-w-xs">
        <button
          type="button"
          class="inline-flex cursor-help text-app-subtle transition-colors hover:text-app-accent"
          aria-label={`Informação: ${label}`}
        >
          <Info class="h-4 w-4" />
        </button>
      </FloatingTooltip>
    {/if}
  </div>
  {@render children()}
</div>
