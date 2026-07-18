<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    label,
    value
  }: {
    label: string;
    value: string | Snippet | null | undefined;
  } = $props();

  const isEmpty = $derived(
    value === null ||
      value === undefined ||
      value === "" ||
      value === "—"
  );
</script>

{#if !isEmpty}
  <tr class="border-b border-app-border/60 last:border-0">
    <th class="w-40 py-2 pr-4 text-left text-xs font-medium text-app-muted">{label}</th>
    <td class="py-2 text-sm text-app-fg">
      {#if typeof value === "string"}
        {value}
      {:else if value}
        {@render value()}
      {/if}
    </td>
  </tr>
{/if}
