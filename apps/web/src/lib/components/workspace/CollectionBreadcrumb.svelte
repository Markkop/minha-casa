<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { Check, ChevronDown, FolderOpen, Pencil, Plus, Star, Trash2 } from "@lucide/svelte";
  import CollectionModal from "$lib/components/anuncios/CollectionModal.svelte";
  import ShareCollectionModal from "$lib/components/anuncios/ShareCollectionModal.svelte";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import type { Collection } from "$lib/anuncios/types";
  import { cn } from "$lib/utils";
  import { workspaceTopBarControlClass } from "$lib/workspace-chrome";

  let { class: className = "" } = $props<{ class?: string }>();

  const ctx = getCollectionsContext();

  let open = $state(false);
  let showCollectionModal = $state(false);
  let showShareModal = $state(false);
  let editingCollection = $state<Collection | null>(null);

  const label = $derived(
    ctx.isLoading ? "Carregando..." : ctx.activeCollection?.label ?? "Nenhuma coleção"
  );

  const listingCount = $derived(
    $page.url.pathname === "/anuncios"
      ? ctx.listings.length
      : (ctx.activeCollection?.listingsCount ?? 0)
  );

  function shouldNavigateToAnuncios(collectionId: string) {
    return $page.url.pathname !== "/anuncios" && ctx.activeCollection?.id !== collectionId;
  }

  function selectCollection(collection: Collection) {
    ctx.setActiveCollection(collection);
    open = false;
    if (shouldNavigateToAnuncios(collection.id)) {
      void goto("/anuncios");
    }
  }

  function openCreate() {
    editingCollection = null;
    showCollectionModal = true;
    open = false;
  }

  function openEdit(collection: Collection) {
    editingCollection = collection;
    showCollectionModal = true;
    open = false;
  }

  function openShare(collection: Collection) {
    editingCollection = collection;
    showShareModal = true;
    open = false;
  }

  function closeOnOutside(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    if (!target?.closest("[data-collection-breadcrumb]")) open = false;
  }
</script>

<svelte:window onclick={closeOnOutside} />

<div data-collection-breadcrumb class={cn("relative min-w-0", className)}>
  <button
    type="button"
    data-testid="global-collection-breadcrumb"
    class={cn(workspaceTopBarControlClass, "max-w-[44vw] md:max-w-[340px]")}
    aria-label="Selecionar coleção"
    disabled={ctx.isLoading}
    onclick={(event) => {
      event.stopPropagation();
      open = !open;
    }}
  >
    <FolderOpen class="size-3.5 shrink-0 text-app-muted" />
    <span class="truncate">{label}</span>
    {#if ctx.activeCollection}
      <span class="shrink-0 text-xs leading-none text-app-muted">({listingCount})</span>
    {/if}
    <ChevronDown class="size-3.5 shrink-0 text-app-muted" />
  </button>

  {#if open}
    <div
      role="menu"
      class="absolute left-0 top-10 z-50 w-72 overflow-hidden rounded-md border border-app-border bg-app-surface py-1 text-sm text-app-fg shadow-lg"
    >
      <div class="px-3 py-1.5 text-xs font-medium text-app-muted">Coleções</div>
      {#if ctx.collections.length === 0}
        <div class="px-3 py-2 text-app-muted">Nenhuma coleção</div>
      {:else}
        {#each ctx.collections as collection (collection.id)}
          <button
            type="button"
            class="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-app-surface-muted"
            onclick={() => selectCollection(collection)}
          >
            {#if collection.isDefault}
              <Star class="h-4 w-4 fill-current" />
            {:else}
              <FolderOpen class="h-4 w-4" />
            {/if}
            <span class="min-w-0 flex-1 truncate">{collection.label}</span>
            {#if ctx.activeCollection?.id === collection.id}<Check class="h-4 w-4" />{/if}
          </button>
        {/each}
      {/if}
      <div class="my-1 border-t border-app-border"></div>
      <button type="button" class="flex w-full items-center gap-2 px-3 py-2 hover:bg-app-surface-muted" onclick={openCreate}>
        <Plus class="h-4 w-4" />
        <span>Nova coleção</span>
      </button>
      {#if ctx.activeCollection}
        <button type="button" class="flex w-full items-center gap-2 px-3 py-2 hover:bg-app-surface-muted" onclick={() => openEdit(ctx.activeCollection!)}>
          <Pencil class="h-4 w-4" />
          <span>Editar coleção</span>
        </button>
        <button
          type="button"
          class="flex w-full items-center gap-2 px-3 py-2 hover:bg-app-surface-muted"
          onclick={() => void ctx.setDefaultCollection(ctx.activeCollection!.id)}
        >
          <Star class="h-4 w-4" />
          <span>{ctx.activeCollection.isDefault ? "Coleção padrão" : "Definir como padrão"}</span>
        </button>
        <button type="button" class="flex w-full items-center gap-2 px-3 py-2 hover:bg-app-surface-muted" onclick={() => openShare(ctx.activeCollection!)}>
          <FolderOpen class="h-4 w-4" />
          <span>Compartilhar</span>
        </button>
        <button
          type="button"
          class="flex w-full items-center gap-2 px-3 py-2 text-destructive hover:bg-app-surface-muted"
          onclick={() => openEdit(ctx.activeCollection!)}
        >
          <Trash2 class="h-4 w-4" />
          <span>Excluir coleção</span>
        </button>
      {/if}
    </div>
  {/if}
</div>

<CollectionModal
  isOpen={showCollectionModal}
  collection={editingCollection}
  onClose={() => {
    showCollectionModal = false;
    editingCollection = null;
    void ctx.loadCollections();
  }}
  onCollectionChange={() => {
    void ctx.loadCollections();
    ctx.triggerRefresh();
  }}
/>

<ShareCollectionModal
  isOpen={showShareModal}
  collection={editingCollection}
  onClose={() => {
    showShareModal = false;
    editingCollection = null;
  }}
/>
