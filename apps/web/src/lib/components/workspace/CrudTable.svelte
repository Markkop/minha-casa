<script lang="ts" generics="T extends { id: string }">
  import Button from "$lib/components/ui/Button.svelte";

  let {
    rows,
    columns,
    loading = false,
    emptyLabel = "Nenhum registro",
    onEdit,
    onDelete
  } = $props<{
    rows: T[];
    loading?: boolean;
    emptyLabel?: string;
    columns: { key: string; label: string; value: (row: T) => string | number | null | undefined }[];
    onEdit?: (row: T) => void;
    onDelete?: (row: T) => void;
  }>();
</script>

<div class="overflow-hidden rounded-md border border-app-border bg-app-surface">
  <table class="w-full border-collapse text-left text-sm">
    <thead class="bg-app-surface-muted text-xs uppercase text-app-muted">
      <tr>
        {#each columns as column}
          <th class="px-3 py-3 font-medium">{column.label}</th>
        {/each}
        <th class="w-40 px-3 py-3 font-medium">Acoes</th>
      </tr>
    </thead>
    <tbody>
      {#if loading}
        <tr><td class="px-3 py-8 text-center text-app-muted" colspan={columns.length + 1}>Carregando...</td></tr>
      {:else if rows.length === 0}
        <tr><td class="px-3 py-8 text-center text-app-muted" colspan={columns.length + 1}>{emptyLabel}</td></tr>
      {:else}
        {#each rows as row (row.id)}
          <tr class="border-t border-app-border">
            {#each columns as column}
              <td class="max-w-72 truncate px-3 py-3" title={String(column.value(row) ?? "")}>
                {column.value(row) ?? ""}
              </td>
            {/each}
            <td class="px-3 py-2">
              <div class="flex gap-2">
                {#if onEdit}
                  <Button variant="secondary" class="h-8 px-3" onclick={() => onEdit?.(row)}>Editar</Button>
                {/if}
                {#if onDelete}
                  <Button variant="danger" class="h-8 px-3" onclick={() => onDelete?.(row)}>Excluir</Button>
                {/if}
              </div>
            </td>
          </tr>
        {/each}
      {/if}
    </tbody>
  </table>
</div>
