<script lang="ts">
  import { Check, Trash2, X } from "@lucide/svelte";
  import WorkspaceDataTableRow from "$lib/components/workspace/table/WorkspaceDataTableRow.svelte";
  import WorkspaceEditButton from "$lib/components/workspace/table/WorkspaceEditButton.svelte";
  import WorkspaceTableActions from "$lib/components/workspace/table/WorkspaceTableActions.svelte";
  import WorkspaceTableCell from "$lib/components/workspace/table/WorkspaceTableCell.svelte";
  import WorkspaceTableIconButton from "$lib/components/workspace/table/WorkspaceTableIconButton.svelte";
  import WorkspaceTableInput from "$lib/components/workspace/table/WorkspaceTableInput.svelte";
  import type { Condominium } from "$lib/workspace/client";
  import { workspaceApi } from "$lib/workspace/client";
  import type { useInlineRowEdit } from "$lib/workspace/use-inline-row-edit.svelte";
  import { amenitiesToString, condominiumSelectClass } from "$lib/components/condominios/condominiums-shared";

  let {
    condominium,
    rowEdit,
    editAmenities,
    saving,
    editingLocked,
    onStartEdit,
    onSave,
    onCancel,
    onDeleted,
    onEditAmenitiesChange
  }: {
    condominium: Condominium;
    rowEdit: ReturnType<typeof useInlineRowEdit<Condominium>>;
    editAmenities: string;
    saving: boolean;
    editingLocked: boolean;
    onStartEdit: (condominium: Condominium) => void;
    onSave: () => void | Promise<void>;
    onCancel: () => void;
    onDeleted: (id: string) => void;
    onEditAmenitiesChange: (value: string) => void;
  } = $props();

  const editing = $derived(rowEdit.isEditing(condominium.id) && !!rowEdit.draft);
</script>

<WorkspaceDataTableRow>
  <WorkspaceTableCell inputCell={Boolean(editing)}>
    {#if editing && rowEdit.draft}
      <WorkspaceTableInput
        value={rowEdit.draft.name}
        oninput={(event) => rowEdit.updateDraft({ name: event.currentTarget.value })}
      />
    {:else}
      <span class="font-medium text-app-fg">{condominium.name}</span>
    {/if}
  </WorkspaceTableCell>
  <WorkspaceTableCell inputCell={Boolean(editing)}>
    {#if editing && rowEdit.draft}
      <WorkspaceTableInput
        placeholder="Cidade"
        value={rowEdit.draft.city ?? ""}
        oninput={(event) => rowEdit.updateDraft({ city: event.currentTarget.value })}
      />
    {:else}
      {condominium.city ?? ""}
    {/if}
  </WorkspaceTableCell>
  <WorkspaceTableCell inputCell={Boolean(editing)}>
    {#if editing && rowEdit.draft}
      <WorkspaceTableInput
        placeholder="Bairro"
        value={rowEdit.draft.neighborhood ?? ""}
        oninput={(event) => rowEdit.updateDraft({ neighborhood: event.currentTarget.value })}
      />
    {:else}
      {condominium.neighborhood ?? ""}
    {/if}
  </WorkspaceTableCell>
  <WorkspaceTableCell inputCell={Boolean(editing)}>
    {#if editing && rowEdit.draft}
      <WorkspaceTableInput
        placeholder="Endereço"
        value={rowEdit.draft.address ?? ""}
        oninput={(event) => rowEdit.updateDraft({ address: event.currentTarget.value })}
      />
    {:else}
      {condominium.address ?? ""}
    {/if}
  </WorkspaceTableCell>
  <WorkspaceTableCell inputCell={Boolean(editing)}>
    {#if editing && rowEdit.draft}
      <select
        class={condominiumSelectClass}
        value={rowEdit.draft.propertyType ?? "none"}
        onchange={(event) => {
          const value = event.currentTarget.value;
          rowEdit.updateDraft({
            propertyType: value === "none" ? null : (value as "casa" | "apartamento")
          });
        }}
      >
        <option value="none">—</option>
        <option value="casa">Casa</option>
        <option value="apartamento">Apartamento</option>
      </select>
    {:else if condominium.propertyType}
      <span class="capitalize">{condominium.propertyType}</span>
    {:else}
      —
    {/if}
  </WorkspaceTableCell>
  <WorkspaceTableCell inputCell={Boolean(editing && rowEdit.draft)}>
    {#if editing && rowEdit.draft}
      <WorkspaceTableInput
        placeholder="Comodidades"
        value={editAmenities}
        oninput={(event) => onEditAmenitiesChange(event.currentTarget.value)}
      />
    {:else}
      {amenitiesToString(condominium.amenities)}
    {/if}
  </WorkspaceTableCell>
  <WorkspaceTableCell inputCell={Boolean(editing)}>
    {#if editing && rowEdit.draft}
      <WorkspaceTableInput
        placeholder="Notas"
        value={rowEdit.draft.notes ?? ""}
        oninput={(event) => rowEdit.updateDraft({ notes: event.currentTarget.value })}
      />
    {:else}
      {condominium.notes ?? ""}
    {/if}
  </WorkspaceTableCell>
  <WorkspaceTableCell>
    <span class="rounded-full bg-app-surface-muted px-2 py-0.5 text-xs text-app-muted">
      {condominium.source === "listing" ? "anúncio" : "manual"}
    </span>
  </WorkspaceTableCell>
  <WorkspaceTableActions>
    {#if editing}
      <WorkspaceTableIconButton
        onclick={() => void onSave()}
        disabled={saving}
        title="Salvar"
        ariaLabel="Salvar"
      >
        <Check class="h-4 w-4" />
      </WorkspaceTableIconButton>
      <WorkspaceTableIconButton
        onclick={onCancel}
        disabled={saving}
        title="Cancelar"
        ariaLabel="Cancelar"
      >
        <X class="h-4 w-4" />
      </WorkspaceTableIconButton>
    {:else}
      <WorkspaceEditButton onclick={() => onStartEdit(condominium)} disabled={editingLocked} />
      <WorkspaceTableIconButton
        title="Excluir"
        ariaLabel="Excluir"
        disabled={editingLocked}
        onclick={() => {
          void workspaceApi.deleteCondominium(condominium.id).then(() => onDeleted(condominium.id));
        }}
      >
        <Trash2 class="h-4 w-4" />
      </WorkspaceTableIconButton>
    {/if}
  </WorkspaceTableActions>
</WorkspaceDataTableRow>
