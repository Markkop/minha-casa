<script lang="ts">
  import WorkspaceDataTable from "$lib/components/workspace/table/WorkspaceDataTable.svelte";
  import WorkspaceDataTableBody from "$lib/components/workspace/table/WorkspaceDataTableBody.svelte";
  import WorkspaceDataTableHeader from "$lib/components/workspace/table/WorkspaceDataTableHeader.svelte";
  import WorkspaceTableEmpty from "$lib/components/workspace/table/WorkspaceTableEmpty.svelte";
  import type { Condominium } from "$lib/workspace/client";
  import type { useInlineRowEdit } from "$lib/workspace/use-inline-row-edit.svelte";
  import { condominiumColumns } from "$lib/components/condominios/condominiums-shared";
  import CondominiumTableRow from "$lib/components/condominios/CondominiumTableRow.svelte";
  import CondominiumAddRow from "$lib/components/condominios/CondominiumAddRow.svelte";
  import type { CondominiumAddDraft } from "$lib/components/condominios/condominiums-shared";

  let {
    condominiums,
    rowEdit,
    editAmenities = $bindable(),
    addDraft = $bindable(),
    addAmenities = $bindable(),
    saving,
    addDisabled,
    onStartEdit,
    onSaveEdit,
    onCancelEdit,
    onDelete,
    onAdd
  }: {
    condominiums: Condominium[];
    rowEdit: ReturnType<typeof useInlineRowEdit<Condominium>>;
    editAmenities: string;
    addDraft: CondominiumAddDraft;
    addAmenities: string;
    saving: boolean;
    addDisabled: boolean;
    onStartEdit: (condominium: Condominium) => void;
    onSaveEdit: () => void | Promise<void>;
    onCancelEdit: () => void;
    onDelete: (id: string) => void;
    onAdd: () => void | Promise<void>;
  } = $props();

  const editingLocked = $derived(rowEdit.editingId !== null);
</script>

<WorkspaceDataTable columns={condominiumColumns} minWidth="1100px">
  <WorkspaceDataTableHeader columns={condominiumColumns} />
  {#if condominiums.length === 0}
    <WorkspaceTableEmpty colSpan={condominiumColumns.length + 1}>
      Nenhum condomínio cadastrado. Use a linha abaixo para adicionar.
    </WorkspaceTableEmpty>
  {/if}
  <WorkspaceDataTableBody>
    {#each condominiums as condominium (condominium.id)}
      <CondominiumTableRow
        {condominium}
        {rowEdit}
        {editAmenities}
        {saving}
        {editingLocked}
        onStartEdit={onStartEdit}
        onSave={onSaveEdit}
        onCancel={onCancelEdit}
        onDeleted={onDelete}
        onEditAmenitiesChange={(value) => (editAmenities = value)}
      />
    {/each}
    <CondominiumAddRow bind:addDraft bind:addAmenities {addDisabled} {onAdd} />
  </WorkspaceDataTableBody>
</WorkspaceDataTable>
