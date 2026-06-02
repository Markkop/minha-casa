<script lang="ts">
  import WorkspaceShell from "$lib/components/layout/WorkspaceShell.svelte";
  import type { LayoutData } from "../$types";

  let { children, data } = $props<{
    children?: import("svelte").Snippet;
    data: LayoutData;
  }>();
</script>

<WorkspaceShell user={data.user} subscriptionActive={data.subscriptionActive}>
  {@render children?.()}
</WorkspaceShell>
