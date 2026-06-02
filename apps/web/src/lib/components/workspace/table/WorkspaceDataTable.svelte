<script lang="ts">
  import WorkspacePanel from "$lib/components/workspace/WorkspacePanel.svelte";
  import {
    WORKSPACE_TABLE_ACTIONS_WIDTH,
    type WorkspaceTableColumn
  } from "$lib/workspace/workspace-table";
  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";

  let {
    columns,
    colgroup,
    minWidth = "720px",
    actionsWidth = WORKSPACE_TABLE_ACTIONS_WIDTH,
    class: className = "",
    children
  }: {
    /** Column widths for table-layout: fixed; renders colgroup when `colgroup` snippet is omitted */
    columns?: WorkspaceTableColumn[];
    colgroup?: Snippet;
    minWidth?: string;
    actionsWidth?: string;
    class?: string;
    children: Snippet;
  } = $props();
</script>

<WorkspacePanel class={cn("overflow-hidden", className)}>
  <div class="overflow-x-auto">
    <table
      class="w-full table-fixed border-collapse text-sm"
      style:min-width={minWidth}
    >
      <colgroup>
        {#if colgroup}
          {@render colgroup()}
        {:else if columns}
          {#each columns as col (col.id)}
            <col style:width={col.width} />
          {/each}
          <col style:width={actionsWidth} />
        {/if}
      </colgroup>
      {@render children()}
    </table>
  </div>
</WorkspacePanel>
