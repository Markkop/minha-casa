<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    colSpan,
    children
  }: {
    colSpan: number;
    children: Snippet;
  } = $props();
</script>

<tbody>
  <tr>
    <td colspan={colSpan} class="px-3 py-4 text-sm text-app-muted">
      {@render children()}
    </td>
  </tr>
</tbody>
