<script lang="ts">
  import { tableCellClass } from "$lib/workspace/workspace-table";
  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";

  let {
    children,
    class: className = "",
    title,
    inputCell = false,
    colSpan
  }: {
    children?: Snippet;
    class?: string;
    title?: string;
    /** Skip truncate wrapper so inputs align with header text */
    inputCell?: boolean;
    colSpan?: number;
  } = $props();
</script>

<td colspan={colSpan} class={cn(tableCellClass, className)} {title}>
  {#if inputCell}
    {@render children?.()}
  {:else}
    <div class="truncate">
      {@render children?.()}
    </div>
  {/if}
</td>
