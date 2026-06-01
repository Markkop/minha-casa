<script lang="ts">
  import type { Snippet } from "svelte";

  let { children }: { children: Snippet } = $props();
</script>

<td class="whitespace-nowrap px-2 py-1.5 align-middle text-right">
  <div class="flex flex-nowrap items-center justify-end gap-1.5">
    {@render children()}
  </div>
</td>
