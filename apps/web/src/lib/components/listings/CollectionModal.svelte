<script lang="ts">
  import { ClipboardList, Loader2, Pencil, Plus, Save, Trash2 } from "@lucide/svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import ModalCloseButton from "$lib/components/listings/ModalCloseButton.svelte";
  import ModalHeaderTitle from "$lib/components/listings/ModalHeaderTitle.svelte";
  import type { Collection } from "$lib/listings/types";
  import { formatApiError } from "$lib/api/error-message";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import { getActiveOrganizationId } from "$lib/api/client";
  import { workspaceApi, type Organization } from "$lib/workspace/client";

  let {
    isOpen,
    onClose,
    collection = null,
    onCollectionChange
  } = $props<{
    isOpen: boolean;
    onClose: () => void;
    collection?: Collection | null;
    onCollectionChange?: () => void;
  }>();

  const ctx = getCollectionsContext();

  let label = $state("");
  let isDefault = $state(false);
  let isPublic = $state(false);
  let showDeleteConfirm = $state(false);
  let error = $state<string | null>(null);
  let isSaving = $state(false);
  let organizations = $state<Organization[]>([]);
  let loadingOrgs = $state(false);
  let targetProfile = $state("personal");
  let showCopyMode = $state(false);
  let copyTargetProfile = $state("personal");
  let copyIncludeListings = $state(true);
  let copyNewName = $state("");
  let isCopying = $state(false);

  const isEditing = $derived(Boolean(collection));

  $effect(() => {
    if (!isOpen) return;
    loadingOrgs = true;
    void workspaceApi
      .fetchOrganizations()
      .then((data) => {
        organizations = data.organizations.filter(
          (org) => org.role === "owner" || org.role === "admin"
        );
      })
      .catch(() => {
        organizations = [];
      })
      .finally(() => {
        loadingOrgs = false;
      });

    if (collection) {
      label = collection.name;
      isDefault = collection.isDefault;
      isPublic = collection.isPublic;
      copyNewName = `${collection.name} (cópia)`;
      copyIncludeListings = true;
    } else {
      label = "";
      isDefault = ctx.collections.length === 0;
      isPublic = false;
      targetProfile = getActiveOrganizationId() ?? "personal";
    }
    showDeleteConfirm = false;
    showCopyMode = false;
    error = null;
  });

  async function handleSave() {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      error = "O nome da coleção não pode estar vazio";
      return;
    }
    const duplicate = ctx.collections.find((c) => c.name === trimmedLabel && c.id !== collection?.id);
    if (duplicate) {
      error = "Já existe uma coleção com este nome";
      return;
    }

    isSaving = true;
    error = null;
    try {
      if (isEditing && collection) {
        await ctx.updateCollection(collection.id, {
          name: trimmedLabel,
          isDefault,
          isPublic
        });
      } else {
        const targetOrgId = targetProfile === "personal" ? null : targetProfile;
        const created = await ctx.createCollectionInProfile(trimmedLabel, targetOrgId, isDefault);
        if (isPublic) await ctx.updateCollection(created.id, { isPublic: true });
        if (!ctx.activeCollection) ctx.setActiveCollection(created);
      }
      onCollectionChange?.();
      onClose();
    } catch (err) {
      error = formatApiError(err, { action: "salvar coleção" });
    } finally {
      isSaving = false;
    }
  }

  async function handleCopy() {
    if (!collection) return;
    isCopying = true;
    error = null;
    try {
      const targetOrgId = copyTargetProfile === "personal" ? null : copyTargetProfile;
      await ctx.copyCollectionToProfile(collection.id, targetOrgId, {
        includeListings: copyIncludeListings,
        newName: copyNewName.trim() || undefined
      });
      onCollectionChange?.();
      onClose();
    } catch (err) {
      error = formatApiError(err, { action: "copiar coleção" });
    } finally {
      isCopying = false;
    }
  }

  async function handleDelete() {
    if (!collection) return;
    if (collection.isDefault && ctx.collections.length === 1) {
      error = "Não é possível excluir a única coleção padrão";
      return;
    }
    isSaving = true;
    try {
      await ctx.deleteCollection(collection.id);
      onCollectionChange?.();
      onClose();
    } catch (err) {
      error = formatApiError(err, { action: "excluir coleção" });
    } finally {
      isSaving = false;
    }
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-[1000] flex items-center justify-center">
    <button type="button" class="absolute inset-0 bg-app-fg/80 backdrop-blur-sm" aria-label="Fechar" onclick={onClose}></button>
    <Card class="relative z-10 mx-4 max-h-[90vh] w-full max-w-md overflow-y-auto border-app-border bg-app-surface">
      <div class="flex items-center justify-between border-b border-app-border px-4 py-3">
        <ModalHeaderTitle
          icon={showCopyMode ? ClipboardList : isEditing ? Pencil : Plus}
          title={showCopyMode ? "Copiar Coleção" : isEditing ? "Editar Coleção" : "Nova Coleção"}
        />
        <ModalCloseButton onclick={onClose} />
      </div>
      <div class="space-y-6 p-4">
        {#if showCopyMode && collection}
          <div class="space-y-2">
            <span class="text-sm text-app-muted">Coleção original</span>
            <p class="rounded-lg border border-app-border bg-app-surface-muted px-3 py-2 text-sm">{collection.name}</p>
          </div>
          <div class="space-y-2">
            <label for="copy-name" class="text-sm text-app-muted">Nome da cópia</label>
            <Input id="copy-name" bind:value={copyNewName} class="border-app-border bg-app-surface-muted" />
          </div>
          <div class="space-y-2">
            <label for="copy-target" class="text-sm text-app-muted">Copiar para</label>
            <select
              id="copy-target"
              bind:value={copyTargetProfile}
              disabled={loadingOrgs}
              class="w-full rounded-lg border border-app-border bg-app-surface-muted px-3 py-2 text-sm"
            >
              <option value="personal">Pessoal</option>
              {#each organizations as org (org.id)}
                <option value={org.id}>{org.name}</option>
              {/each}
            </select>
          </div>
          <label class="flex items-center justify-between gap-3 text-sm">
            <span class="text-app-muted">Incluir imóveis</span>
            <input type="checkbox" bind:checked={copyIncludeListings} class="accent-app-action" />
          </label>
          {#if error}<p class="text-xs text-destructive">{error}</p>{/if}
          <div class="flex gap-2">
            <button type="button" class="flex-1 rounded-lg border border-app-border bg-app-surface-muted py-2.5" onclick={() => (showCopyMode = false)}>
              Voltar
            </button>
            <button type="button" class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-app-action py-2.5 text-app-action-foreground" disabled={isCopying} onclick={() => void handleCopy()}>
              {#if isCopying}<Loader2 class="h-4 w-4 animate-spin" />{:else}<ClipboardList class="h-4 w-4" />{/if}
              Copiar
            </button>
          </div>
        {:else}
          {#if !isEditing}
            <div class="space-y-2">
              <label for="target-profile" class="text-sm text-app-muted">Criar em</label>
              <select id="target-profile" bind:value={targetProfile} disabled={loadingOrgs} class="w-full rounded-lg border border-app-border bg-app-surface-muted px-3 py-2 text-sm">
                <option value="personal">Pessoal</option>
                {#each organizations as org (org.id)}
                  <option value={org.id}>{org.name}</option>
                {/each}
              </select>
            </div>
          {/if}
          <div class="space-y-2">
            <label for="collection-label" class="text-sm text-app-muted">Nome da Coleção</label>
            <Input
              id="collection-label"
              bind:value={label}
              class="border-app-border bg-app-surface-muted"
              onkeydown={(event) => {
                if (event.key === "Enter") void handleSave();
              }}
            />
          </div>
          <label class="flex items-center justify-between gap-3 text-sm">
            <span class="text-app-muted">Coleção padrão</span>
            <input type="checkbox" bind:checked={isDefault} class="accent-app-action" />
          </label>
          <label class="flex items-center justify-between gap-3 text-sm">
            <span class="text-app-muted">Coleção pública</span>
            <input type="checkbox" bind:checked={isPublic} class="accent-app-action" />
          </label>
          {#if error}<p class="text-xs text-destructive">{error}</p>{/if}
          <div class="flex flex-col gap-2">
            <button type="button" class="flex items-center justify-center gap-2 rounded-lg bg-app-action py-2.5 font-medium text-app-action-foreground" disabled={isSaving} onclick={() => void handleSave()}>
              {#if isSaving}<Loader2 class="h-4 w-4 animate-spin" />{:else}<Save class="h-4 w-4" />{/if}
              Salvar
            </button>
            {#if isEditing && collection}
              <button type="button" class="rounded-lg border border-app-border py-2.5 text-sm hover:border-app-action" onclick={() => (showCopyMode = true)}>
                Copiar para outro perfil
              </button>
              {#if showDeleteConfirm}
                <div class="space-y-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                  <p class="text-sm">Excluir "{collection.name}"?</p>
                  <div class="flex gap-2">
                    <button type="button" class="flex-1 rounded border border-app-border py-2 text-sm" onclick={() => (showDeleteConfirm = false)}>Cancelar</button>
                    <button type="button" class="flex flex-1 items-center justify-center gap-1 rounded bg-destructive py-2 text-sm text-white" disabled={isSaving} onclick={() => void handleDelete()}>
                      <Trash2 class="h-4 w-4" /> Excluir
                    </button>
                  </div>
                </div>
              {:else}
                <button type="button" class="rounded-lg border border-destructive/40 py-2.5 text-sm text-destructive" onclick={() => (showDeleteConfirm = true)}>
                  Excluir coleção
                </button>
              {/if}
            {/if}
          </div>
        {/if}
      </div>
    </Card>
  </div>
{/if}
