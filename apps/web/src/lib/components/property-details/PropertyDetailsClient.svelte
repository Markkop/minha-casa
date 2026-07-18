<script lang="ts">
  import { onMount } from "svelte";
  import { Loader2, RefreshCw } from "@lucide/svelte";
  import { ApiError, getActiveOrganizationId } from "$lib/api/client";
  import type { Property } from "$lib/listings/types";
  import PropertyDetailsTabs from "$lib/components/property-details/PropertyDetailsTabs.svelte";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import { cn } from "$lib/utils";
  import { WORKSPACE_CONTENT_CLASS, WORKSPACE_STACK_CLASS } from "$lib/workspace-chrome";
  import { workspaceApi } from "$lib/workspace/client";

  let { listingId }: { listingId: string } = $props();

  const ctx = getCollectionsContext();
  let loadedListing = $state<Property | null>(null);
  let loadedCollectionId = $state<string | null>(null);
  let loadedAccess = $state<"owner" | "admin" | "family_member" | "broker" | "editor" | "viewer" | null>(null);
  let loadState = $state<"loading" | "ready" | "not-found" | "error">("loading");
  let retryRevision = $state(0);
  let orgId = $state<string | null>(null);

  const listing = $derived(
    loadState === "ready"
      ? (ctx.listings.find((item) => item.id === listingId) ?? loadedListing)
      : null
  );
  onMount(() => {
    orgId = getActiveOrganizationId();
    const refresh = () => {
      orgId = getActiveOrganizationId();
      retryRevision += 1;
    };
    window.addEventListener("minha-casa:workspace-context-change", refresh);
    return () => window.removeEventListener("minha-casa:workspace-context-change", refresh);
  });

  $effect(() => {
    const id = listingId;
    void retryRevision;
    let cancelled = false;

    loadedListing = null;
    loadedCollectionId = null;
    loadedAccess = null;
    loadState = "loading";

    if (!id) {
      loadState = "not-found";
      return;
    }

    void workspaceApi
      .fetchListing(id)
      .then((result) => {
        if (cancelled) return;
        loadedListing = ctx.hydrateListingContext(result.collection, result.listing);
        loadedCollectionId = result.collection.id;
        loadedAccess = result.access;
        loadState = "ready";
      })
      .catch((error) => {
        if (cancelled) return;
        loadState = error instanceof ApiError && error.status === 404 ? "not-found" : "error";
      });

    return () => {
      cancelled = true;
    };
  });
</script>

<svelte:head>
  <title>{listing?.title ? `${listing.title} | Minha Casa` : "Imóvel | Minha Casa"}</title>
</svelte:head>

<div class="min-h-[calc(100vh-var(--nav-height,2.75rem))] bg-app-bg text-app-fg">
  <div class={cn(WORKSPACE_CONTENT_CLASS, WORKSPACE_STACK_CLASS, "min-w-0")}>
    {#if loadState === "loading"}
      <div class="flex items-center justify-center gap-2 py-16 text-sm text-app-muted">
        <Loader2 class="h-5 w-5 animate-spin" />
        Carregando imóvel...
      </div>
    {:else if loadState === "not-found"}
      <div class="rounded-lg border border-app-border bg-app-surface p-6 text-center">
        <h1 class="text-lg font-semibold">Imóvel não encontrado</h1>
        <p class="mt-2 text-sm text-app-muted">
          Este imóvel não existe ou não está disponível no perfil atual.
        </p>
        <a class="mt-4 inline-flex rounded-md bg-app-action px-4 py-2 text-sm font-medium text-app-action-foreground" href="/lista">
          Voltar para Lista
        </a>
      </div>
    {:else if loadState === "error"}
      <div class="rounded-lg border border-app-border bg-app-surface p-6 text-center">
        <h1 class="text-lg font-semibold">Não foi possível carregar o imóvel</h1>
        <p class="mt-2 text-sm text-app-muted">Tente novamente ou volte para a Lista.</p>
        <div class="mt-4 flex justify-center gap-2">
          <button class="inline-flex items-center gap-2 rounded-md bg-app-action px-4 py-2 text-sm font-medium text-app-action-foreground" type="button" onclick={() => (retryRevision += 1)}>
            <RefreshCw class="h-4 w-4" /> Tentar novamente
          </button>
          <a class="inline-flex rounded-md border border-app-border px-4 py-2 text-sm font-medium" href="/lista">Lista</a>
        </div>
      </div>
    {:else if listing && loadedCollectionId}
      <PropertyDetailsTabs
        {listing}
        collectionId={loadedCollectionId}
        {orgId}
        readOnly={loadedAccess === "viewer"}
      />
    {/if}
  </div>
</div>
