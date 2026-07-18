<script lang="ts">
  import { Plus } from "@lucide/svelte";
  import WorkspaceDataTableRow from "$lib/components/workspace/table/WorkspaceDataTableRow.svelte";
  import WorkspaceTableActions from "$lib/components/workspace/table/WorkspaceTableActions.svelte";
  import WorkspaceTableCell from "$lib/components/workspace/table/WorkspaceTableCell.svelte";
  import WorkspaceTableIconButton from "$lib/components/workspace/table/WorkspaceTableIconButton.svelte";
  import WorkspaceTableInput from "$lib/components/workspace/table/WorkspaceTableInput.svelte";
  import { condominiumSelectClass } from "$lib/components/condominios/condominiums-shared";
  import type { CondominiumAddDraft } from "$lib/components/condominios/condominiums-shared";

  let {
    addDraft = $bindable(),
    addAmenities = $bindable(),
    addDisabled,
    onAdd
  }: {
    addDraft: CondominiumAddDraft;
    addAmenities: string;
    addDisabled: boolean;
    onAdd: () => void | Promise<void>;
  } = $props();
</script>

<WorkspaceDataTableRow class="bg-app-bg/50">
  <WorkspaceTableCell inputCell>
    <WorkspaceTableInput placeholder="Nome" bind:value={addDraft.name} disabled={addDisabled} />
  </WorkspaceTableCell>
  <WorkspaceTableCell inputCell>
    <WorkspaceTableInput placeholder="Cidade" bind:value={addDraft.city} disabled={addDisabled} />
  </WorkspaceTableCell>
  <WorkspaceTableCell inputCell>
    <WorkspaceTableInput
      placeholder="Bairro"
      bind:value={addDraft.neighborhood}
      disabled={addDisabled}
    />
  </WorkspaceTableCell>
  <WorkspaceTableCell inputCell>
    <WorkspaceTableInput placeholder="Endereço" bind:value={addDraft.address} disabled={addDisabled} />
  </WorkspaceTableCell>
  <WorkspaceTableCell inputCell>
    <select
      class={condominiumSelectClass}
      disabled={addDisabled}
      value={addDraft.propertyType || "none"}
      onchange={(event) => {
        const value = event.currentTarget.value;
        addDraft = {
          ...addDraft,
          propertyType: value === "none" ? "" : (value as "house" | "apartment")
        };
      }}
    >
      <option value="none">—</option>
      <option value="house">Casa</option>
      <option value="apartment">Apartamento</option>
    </select>
  </WorkspaceTableCell>
  <WorkspaceTableCell inputCell>
    <WorkspaceTableInput placeholder="Comodidades" bind:value={addAmenities} disabled={addDisabled} />
  </WorkspaceTableCell>
  <WorkspaceTableCell inputCell>
    <WorkspaceTableInput placeholder="Notas" bind:value={addDraft.notes} disabled={addDisabled} />
  </WorkspaceTableCell>
  <WorkspaceTableCell />
  <WorkspaceTableActions>
    <WorkspaceTableIconButton
      class="bg-app-action text-app-action-foreground hover:bg-app-action-hover"
      title="Adicionar condomínio"
      ariaLabel="Adicionar condomínio"
      disabled={addDisabled || !addDraft.name.trim()}
      onclick={() => void onAdd()}
    >
      <Plus class="h-4 w-4" />
    </WorkspaceTableIconButton>
  </WorkspaceTableActions>
</WorkspaceDataTableRow>
