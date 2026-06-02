<script lang="ts">
  import { tableHeadClass, type WorkspaceTableColumn } from "$lib/workspace/workspace-table";
  import { cn } from "$lib/utils";

  let { columns }: { columns: WorkspaceTableColumn[] } = $props();
</script>

<thead class="border-b border-app-border bg-app-bg">
  <tr>
    {#each columns as col (col.id)}
      <th scope="col" class={tableHeadClass}>
        {col.header}
      </th>
    {/each}
    <th scope="col" class={cn(tableHeadClass, "text-right")}>
      Ações
    </th>
  </tr>
</thead>
