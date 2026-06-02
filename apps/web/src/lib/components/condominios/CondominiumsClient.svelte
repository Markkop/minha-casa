<script lang="ts">
  import { onMount } from "svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import WorkspaceIntroCard from "$lib/components/workspace/WorkspaceIntroCard.svelte";
  import WorkspacePage from "$lib/components/workspace/WorkspacePage.svelte";
  import { getActiveOrganizationId } from "$lib/api/client";
  import { workspaceApi, type Condominium } from "$lib/workspace/client";
  import { useInlineRowEdit } from "$lib/workspace/use-inline-row-edit.svelte";
  import { useEscapeToCancel } from "$lib/workspace/use-escape-to-cancel.svelte";
  import CondominiumsTable from "$lib/components/condominios/CondominiumsTable.svelte";
  import {
    emptyAdd,
    parseAmenities,
    amenitiesToString
  } from "$lib/components/condominios/condominiums-shared";

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

  function handleDelete(id: string) {
    condominiums = condominiums.filter((row) => row.id !== id);
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
    <CondominiumsTable
      {condominiums}
      {rowEdit}
      bind:editAmenities
      bind:addDraft
      bind:addAmenities
      {saving}
      {addDisabled}
      onStartEdit={handleStartEdit}
      onSaveEdit={saveEdit}
      onCancelEdit={handleCancelEdit}
      onDelete={handleDelete}
      onAdd={add}
    />
  {/if}
</WorkspacePage>
