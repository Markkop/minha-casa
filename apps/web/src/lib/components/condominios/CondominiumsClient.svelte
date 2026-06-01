<script lang="ts">
  import { onMount } from "svelte";
  import { Check, Plus, Trash2, X } from "@lucide/svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import WorkspaceIntroCard from "$lib/components/workspace/WorkspaceIntroCard.svelte";
  import WorkspacePage from "$lib/components/workspace/WorkspacePage.svelte";
  import WorkspaceDataTable from "$lib/components/workspace/table/WorkspaceDataTable.svelte";
  import WorkspaceDataTableBody from "$lib/components/workspace/table/WorkspaceDataTableBody.svelte";
  import WorkspaceDataTableHeader from "$lib/components/workspace/table/WorkspaceDataTableHeader.svelte";
  import WorkspaceDataTableRow from "$lib/components/workspace/table/WorkspaceDataTableRow.svelte";
  import WorkspaceEditButton from "$lib/components/workspace/table/WorkspaceEditButton.svelte";
  import WorkspaceTableActions from "$lib/components/workspace/table/WorkspaceTableActions.svelte";
  import WorkspaceTableCell from "$lib/components/workspace/table/WorkspaceTableCell.svelte";
  import WorkspaceTableEmpty from "$lib/components/workspace/table/WorkspaceTableEmpty.svelte";
  import WorkspaceTableIconButton from "$lib/components/workspace/table/WorkspaceTableIconButton.svelte";
  import WorkspaceTableInput from "$lib/components/workspace/table/WorkspaceTableInput.svelte";
  import { getActiveOrganizationId } from "$lib/api/client";
  import { workspaceApi, type Condominium } from "$lib/workspace/client";
  import { useInlineRowEdit } from "$lib/workspace/use-inline-row-edit.svelte";
  import { useEscapeToCancel } from "$lib/workspace/use-escape-to-cancel.svelte";
  import { type WorkspaceTableColumn } from "$lib/workspace/workspace-table";

  const emptyAdd = {
    name: "",
    city: "",
    neighborhood: "",
    address: "",
    propertyType: "" as "" | "casa" | "apartamento",
    amenities: "",
    notes: ""
  };

  const condominiumColumns: WorkspaceTableColumn[] = [
    { id: "name", header: "Nome", width: "16%" },
    { id: "city", header: "Cidade", width: "11%" },
    { id: "neighborhood", header: "Bairro", width: "11%" },
    { id: "address", header: "Endereço", width: "14%" },
    { id: "propertyType", header: "Tipo", width: "9%" },
    { id: "amenities", header: "Comodidades", width: "18%" },
    { id: "notes", header: "Notas", width: "14%" },
    { id: "source", header: "Origem", width: "80px" }
  ];

  const selectClass =
    "h-8 w-full min-w-0 rounded-md border border-app-border bg-white px-2 text-sm text-app-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent disabled:opacity-60 dark:bg-white";

  let condominiums = $state<Condominium[]>([]);
  let addDraft = $state({ ...emptyAdd });
  let editAmenities = $state("");
  let addAmenities = $state("");
  let error = $state<string | null>(null);
  let loading = $state(true);
  let syncing = $state(false);
  let saving = $state(false);
  let profileLabel = $state("Perfil pessoal");

  const rowEdit = useInlineRowEdit<Condominium>();
  const addDisabled = $derived(saving || rowEdit.editingId !== null);

  function amenitiesToString(amenities: string[]) {
    return amenities.join(", ");
  }

  function parseAmenities(value: string) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  async function refreshProfileLabel() {
    const orgId = getActiveOrganizationId();
    if (!orgId) {
      profileLabel = "Perfil pessoal";
      return;
    }
    try {
      const { organizations } = await workspaceApi.fetchOrganizations();
      profileLabel = organizations.find((org) => org.id === orgId)?.name ?? "Perfil pessoal";
    } catch {
      profileLabel = "Perfil pessoal";
    }
  }

  async function load(options?: { sync?: boolean }) {
    if (options?.sync) syncing = true;
    else loading = condominiums.length === 0;
    error = null;
    try {
      const data = options?.sync
        ? await workspaceApi.syncCondominiums()
        : await workspaceApi.fetchCondominiums();
      condominiums = data.condominiums;
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao carregar condomínios";
    } finally {
      loading = false;
      syncing = false;
    }
  }

  function handleStartEdit(condominium: Condominium) {
    rowEdit.startEdit(condominium);
    editAmenities = amenitiesToString(condominium.amenities);
  }

  function handleCancelEdit() {
    rowEdit.cancelEdit();
    editAmenities = "";
  }

  async function saveEdit() {
    const draft = rowEdit.draft;
    const editingId = rowEdit.editingId;
    if (!draft || !editingId) return;
    saving = true;
    error = null;
    try {
      const { condominium } = await workspaceApi.saveCondominium(
        {
          name: draft.name,
          city: draft.city,
          neighborhood: draft.neighborhood,
          address: draft.address,
          propertyType: draft.propertyType,
          amenities: parseAmenities(editAmenities),
          notes: draft.notes
        },
        editingId
      );
      handleCancelEdit();
      condominiums = condominiums.map((row) =>
        row.id === editingId
          ? { ...condominium, listingCount: row.listingCount, listings: row.listings }
          : row
      );
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao salvar condomínio";
    } finally {
      saving = false;
    }
  }

  async function add() {
    saving = true;
    error = null;
    try {
      const { condominium } = await workspaceApi.saveCondominium({
        name: addDraft.name,
        city: addDraft.city,
        neighborhood: addDraft.neighborhood,
        address: addDraft.address,
        propertyType: addDraft.propertyType || null,
        amenities: parseAmenities(addAmenities),
        notes: addDraft.notes
      });
      addDraft = { ...emptyAdd };
      addAmenities = "";
      condominiums = [{ ...condominium, listingCount: 0, listings: [] }, ...condominiums];
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao salvar condomínio";
    } finally {
      saving = false;
    }
  }

  useEscapeToCancel(() => rowEdit.editingId !== null, handleCancelEdit);

  onMount(() => {
    void refreshProfileLabel();
    void load();
    const onOrgChange = () => {
      void refreshProfileLabel();
      void load();
    };
    window.addEventListener("minha-casa:organization-context-change", onOrgChange);
    return () => window.removeEventListener("minha-casa:organization-context-change", onOrgChange);
  });
</script>

{#snippet toolbar()}
  <Button
    variant="outline"
    size="sm"
    disabled={syncing}
    onclick={() => void load({ sync: true })}
  >
    {syncing ? "Atualizando..." : "Atualizar dos anúncios"}
  </Button>
{/snippet}

<WorkspacePage toolbar={toolbar}>
  <WorkspaceIntroCard>
    Detalhes reutilizáveis para comparar imóveis no mesmo condomínio. {profileLabel}.
  </WorkspaceIntroCard>

  {#if error}
    <p class="mb-3 text-sm text-red-600">{error}</p>
  {/if}

  {#if loading}
    <p class="text-sm text-app-muted">Carregando condomínios...</p>
  {:else}
    <WorkspaceDataTable columns={condominiumColumns} minWidth="1100px">
      <WorkspaceDataTableHeader columns={condominiumColumns} />
      {#if condominiums.length === 0}
        <WorkspaceTableEmpty colSpan={condominiumColumns.length + 1}>
          Nenhum condomínio cadastrado. Use a linha abaixo para adicionar.
        </WorkspaceTableEmpty>
      {/if}
      <WorkspaceDataTableBody>
        {#each condominiums as condominium (condominium.id)}
          {@const editing = rowEdit.isEditing(condominium.id) && !!rowEdit.draft}
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
                  class={selectClass}
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
                  bind:value={editAmenities}
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
                  onclick={() => void saveEdit()}
                  disabled={saving}
                  title="Salvar"
                  ariaLabel="Salvar"
                >
                  <Check class="h-4 w-4" />
                </WorkspaceTableIconButton>
                <WorkspaceTableIconButton
                  onclick={handleCancelEdit}
                  disabled={saving}
                  title="Cancelar"
                  ariaLabel="Cancelar"
                >
                  <X class="h-4 w-4" />
                </WorkspaceTableIconButton>
              {:else}
                <WorkspaceEditButton
                  onclick={() => handleStartEdit(condominium)}
                  disabled={rowEdit.editingId !== null}
                />
                <WorkspaceTableIconButton
                  title="Excluir"
                  ariaLabel="Excluir"
                  disabled={rowEdit.editingId !== null}
                  onclick={() => {
                    void workspaceApi.deleteCondominium(condominium.id).then(() => {
                      condominiums = condominiums.filter((row) => row.id !== condominium.id);
                    });
                  }}
                >
                  <Trash2 class="h-4 w-4" />
                </WorkspaceTableIconButton>
              {/if}
            </WorkspaceTableActions>
          </WorkspaceDataTableRow>
        {/each}
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
              class={selectClass}
              disabled={addDisabled}
              value={addDraft.propertyType || "none"}
              onchange={(event) => {
                const value = event.currentTarget.value;
                addDraft = {
                  ...addDraft,
                  propertyType: value === "none" ? "" : (value as "casa" | "apartamento")
                };
              }}
            >
              <option value="none">—</option>
              <option value="casa">Casa</option>
              <option value="apartamento">Apartamento</option>
            </select>
          </WorkspaceTableCell>
          <WorkspaceTableCell inputCell>
            <WorkspaceTableInput
              placeholder="Comodidades"
              bind:value={addAmenities}
              disabled={addDisabled}
            />
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
              onclick={() => void add()}
            >
              <Plus class="h-4 w-4" />
            </WorkspaceTableIconButton>
          </WorkspaceTableActions>
        </WorkspaceDataTableRow>
      </WorkspaceDataTableBody>
    </WorkspaceDataTable>
  {/if}
</WorkspacePage>
