<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { Download, FolderOpen, Link2, Loader2, Plus } from "@lucide/svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import { getActiveOrganizationId } from "$lib/api/client";
  import { syncSubscriptionCookie } from "$lib/sync-subscription-cookie";
  import { cn } from "$lib/utils";
  import { workspaceApi } from "$lib/workspace/client";
  import { getDefaultFirstCollectionName } from "$lib/anuncios/default-first-collection-name";
  import { LISTINGS_PAGE_CLASS } from "$lib/anuncios/listings-panel-layout";
  import { WORKSPACE_CONTENT_CLASS } from "$lib/workspace-chrome";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import { toListingData, type Imovel } from "$lib/anuncios/types";
  import type { ListingData } from "$lib/workspace/client";
  import AnunciosQuerySync from "$lib/components/anuncios/AnunciosQuerySync.svelte";
  import ListingsTable from "$lib/components/anuncios/ListingsTable.svelte";
  import ListingsMap from "$lib/components/anuncios/ListingsMap.svelte";
  import ModalCloseButton from "$lib/components/anuncios/ModalCloseButton.svelte";

  const ctx = getCollectionsContext();

  let isCreatingFirstCollection = $state(false);
  let createCollectionError = $state<string | null>(null);
  let showShareConfirm = $state(false);
  let shareData = $state<{ collection: { id: string; name: string }; listings: ListingData[] } | null>(null);
  let isImportingShare = $state(false);
  let shareImportError = $state<string | null>(null);
  let loadedShareToken = $state<string | null>(null);
  let activeOrgId = $state<string | null>(null);
  let activeOrgName = $state<string | null>(null);

  const shareToken = $derived($page.url.searchParams.get("share") ?? $page.url.searchParams.get("dbshare"));
  const isOrgContext = $derived(Boolean(activeOrgId));
  const contextName = $derived(isOrgContext ? (activeOrgName ?? "organização") : "pessoal");
  const defaultCollectionName = getDefaultFirstCollectionName();

  async function refreshOrganizationContext() {
    activeOrgId = getActiveOrganizationId();
    if (!activeOrgId) {
      activeOrgName = null;
      return;
    }
    try {
      const { organizations } = await workspaceApi.fetchOrganizations();
      activeOrgName = organizations.find((org) => org.id === activeOrgId)?.name ?? null;
    } catch {
      activeOrgName = null;
    }
  }

  onMount(() => {
    void syncSubscriptionCookie();
    void refreshOrganizationContext();
    const onOrgChange = () => void refreshOrganizationContext();
    window.addEventListener("minha-casa:organization-context-change", onOrgChange);
    return () => window.removeEventListener("minha-casa:organization-context-change", onOrgChange);
  });

  $effect(() => {
    const token = shareToken;
    if (!token || ctx.isLoading || loadedShareToken === token) return;
    loadedShareToken = token;
    void (async () => {
      try {
        const loaded = await ctx.loadSharedCollection(token);
        shareData = {
          collection: loaded.collection,
          listings: loaded.listings.map((listing) => toListingData(listing))
        };
        showShareConfirm = true;
      } catch (err) {
        shareImportError = err instanceof Error ? err.message : "Link de compartilhamento inválido";
      }
    })();
  });

  async function handleCreateCollection() {
    if (ctx.collections.length > 0) return;
    isCreatingFirstCollection = true;
    createCollectionError = null;
    try {
      await ctx.createCollection(getDefaultFirstCollectionName(), true);
      ctx.triggerRefresh();
      if (ctx.activeCollection?.id) {
        await ctx.loadListings(ctx.activeCollection.id);
      }
    } catch (err) {
      createCollectionError = err instanceof Error ? err.message : "Erro ao criar coleção";
    } finally {
      isCreatingFirstCollection = false;
    }
  }

  async function handleShareImport() {
    if (!shareData) return;
    isImportingShare = true;
    shareImportError = null;
    try {
      await ctx.importSharedListings(shareData.listings);
      showShareConfirm = false;
      shareData = null;
      if (ctx.activeCollection?.id) {
        await ctx.loadListings(ctx.activeCollection.id);
      }
    } catch (err) {
      shareImportError = err instanceof Error ? err.message : "Erro ao importar coleção";
    } finally {
      isImportingShare = false;
    }
  }

  function handleShareCancel() {
    showShareConfirm = false;
    shareData = null;
    shareImportError = null;
  }
</script>

<svelte:head>
  <title>Anúncios de Imóveis | Parser IA | Minha Casa</title>
  <meta
    name="description"
    content="Gerencie anúncios de imóveis com extração automática de dados usando IA."
  />
</svelte:head>

<AnunciosQuerySync />

{#if ctx.isLoading}
  <div class="flex min-h-[calc(100vh-var(--nav-height,2.75rem))] items-center justify-center bg-app-bg text-app-muted">
    <Loader2 class="h-6 w-6 animate-spin" />
    <span class="ml-2 text-sm">Carregando...</span>
  </div>
{:else if ctx.error}
  <div class={cn("min-h-[calc(100vh-var(--nav-height,2.75rem))] bg-app-bg text-app-fg", WORKSPACE_CONTENT_CLASS)}>
    <div class="rounded-md border border-app-border bg-app-surface p-6 text-center">
      <p class="mb-2 font-medium">Erro ao carregar dados</p>
      <p class="text-sm text-app-muted">{ctx.error}</p>
    </div>
  </div>
{:else if ctx.collections.length === 0}
  <div class="min-h-[calc(100vh-var(--nav-height,2.75rem))] bg-app-bg text-app-fg">
    <main class={WORKSPACE_CONTENT_CLASS}>
      <Card class="mx-auto max-w-lg border-app-border bg-app-surface">
        <div class="space-y-6 py-12 text-center">
          <FolderOpen class="mx-auto h-16 w-16 text-muted-foreground" />
          <div class="space-y-2">
            <h2 class="text-xl font-semibold text-app-fg">
              {#if isOrgContext}
                Nenhuma coleção na organização "{contextName}"
              {:else}
                Nenhuma coleção pessoal
              {/if}
            </h2>
            <p class="mx-auto max-w-sm text-sm text-app-muted">
              {#if isOrgContext}
                Comece agora — criamos automaticamente a coleção "{defaultCollectionName}" nesta organização.
              {:else}
                Comece agora — criamos automaticamente a coleção "{defaultCollectionName}" para você salvar imóveis.
              {/if}
            </p>
          </div>
          {#if createCollectionError}
            <p class="text-sm text-destructive">{createCollectionError}</p>
          {/if}
          <button
            type="button"
            onclick={() => void handleCreateCollection()}
            disabled={isCreatingFirstCollection}
            class={cn(
              "mx-auto flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium transition-all",
              "bg-app-action text-app-action-foreground hover:bg-app-action-hover",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            {#if isCreatingFirstCollection}
              <Loader2 class="h-4 w-4 animate-spin" />
              <span>Criando...</span>
            {:else}
              <Plus class="h-4 w-4" />
              <span>Criar Primeira Coleção</span>
            {/if}
          </button>
        </div>
      </Card>
    </main>
  </div>
{:else}
  <div class="min-h-[calc(100vh-var(--nav-height,2.75rem))] bg-app-bg text-app-fg">
    {#if showShareConfirm && shareData}
      <div class="fixed inset-0 z-[1000] flex items-center justify-center">
        <button
          type="button"
          class="absolute inset-0 bg-app-fg/40 backdrop-blur-sm"
          aria-label="Fechar"
          onclick={handleShareCancel}
        ></button>
        <Card class="relative z-10 mx-4 w-full max-w-md border-app-border bg-app-surface">
          <div class="flex items-center justify-between border-b border-app-border px-4 py-3">
            <h2 class="flex items-center gap-2 text-lg font-semibold">
              <Link2 class="h-5 w-5 text-app-accent" />
              Importar Coleção Compartilhada
            </h2>
            <ModalCloseButton onclick={handleShareCancel} />
          </div>
          <div class="space-y-4 p-4">
            <p class="text-sm text-app-muted">Você recebeu um link compartilhado com dados de uma coleção:</p>
            <div class="rounded-lg border border-app-border bg-app-bg p-3">
              <p class="text-sm font-medium text-app-fg">{shareData.collection.name}</p>
              <p class="mt-1 text-xs text-muted-foreground">
                {shareData.listings.length} imóvel{shareData.listings.length === 1 ? "" : "eis"}
              </p>
            </div>
            <p class="text-xs text-muted-foreground">
              Deseja importar esta coleção? Os dados serão adicionados à sua coleção atual.
            </p>
            {#if shareImportError}
              <p class="text-sm text-destructive">{shareImportError}</p>
            {/if}
            <div class="flex gap-2">
              <button
                type="button"
                class={cn(
                  "flex-1 rounded-lg border border-app-border bg-app-surface py-2.5 text-sm font-medium text-app-fg transition-all",
                  "hover:border-app-border-strong hover:bg-app-bg"
                )}
                onclick={handleShareCancel}
              >
                Cancelar
              </button>
              <button
                type="button"
                class={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg bg-app-action py-2.5 text-sm font-medium text-app-action-foreground transition-all",
                  "hover:bg-app-action-hover disabled:opacity-50"
                )}
                disabled={isImportingShare}
                onclick={() => void handleShareImport()}
              >
                {#if isImportingShare}
                  <Loader2 class="h-4 w-4 animate-spin" />
                {:else}
                  <Download class="h-4 w-4" />
                {/if}
                Importar
              </button>
            </div>
          </div>
        </Card>
      </div>
    {/if}

    <main class={LISTINGS_PAGE_CLASS}>
      {#if ctx.isLoadingListings && ctx.listings.length === 0}
        <p class="rounded-md border border-app-border bg-app-surface py-8 text-center text-sm text-app-muted">
          Carregando imóveis...
        </p>
      {:else}
        <ListingsTable listings={ctx.listings} refreshTrigger={ctx.refreshTrigger} />
      {/if}
      <ListingsMap listings={ctx.listings} />
    </main>
  </div>
{/if}
