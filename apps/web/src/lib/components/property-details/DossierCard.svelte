<script lang="ts">
  import type { Snippet } from "svelte";
  import WorkspacePanel from "$lib/components/workspace/WorkspacePanel.svelte";

  let {
    title,
    children
  }: {
    title: string;
    children: Snippet;
  } = $props();
</script>

<WorkspacePanel class="p-4">
  <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-app-muted">{title}</h3>
  <table class="w-full">
    <tbody>
      {@render children()}
    </tbody>
  </table>
</WorkspacePanel>
