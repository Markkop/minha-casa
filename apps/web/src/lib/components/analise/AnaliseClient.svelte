<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import AnaliseQuerySync from "$lib/components/analise/AnaliseQuerySync.svelte";
  import WorkspaceListingQuerySync from "$lib/components/workspace/WorkspaceListingQuerySync.svelte";
  import AnaliseTabbedDossier from "$lib/components/analise/AnaliseTabbedDossier.svelte";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import { getAdminFeatureFlag, readAdminFeatureFlags } from "$lib/admin/client";
  import { getActiveOrganizationId } from "$lib/api/client";
  import { cn } from "$lib/utils";
  import { WORKSPACE_CONTENT_CLASS, WORKSPACE_STACK_CLASS } from "$lib/workspace-chrome";

  const ctx = getCollectionsContext();

  let { isAdmin = false } = $props<{ isAdmin?: boolean }>();

  let storedFlagsSyncTick = $state(0);
  const storedFlags = $derived.by(() => {
    void storedFlagsSyncTick;
    return readAdminFeatureFlags(isAdmin);
  });
  const showDeepAnalysis = $derived(
    getAdminFeatureFlag(storedFlags, "deepAnalysis", isAdmin)
  );

  onMount(() => {
    const syncFlags = () => {
      storedFlagsSyncTick += 1;
    };
    window.addEventListener("storage", syncFlags);
    return () => window.removeEventListener("storage", syncFlags);
  });
  const selectedListingId = $derived(page.url.searchParams.get("listing"));
  const orgId = $derived(getActiveOrganizationId());

  const sortedListings = $derived(
    [...ctx.listings]
      .filter((listing) => !listing.strikethrough)
      .sort((a, b) => (a.titulo ?? "").localeCompare(b.titulo ?? "", "pt-BR"))
  );

  const selectedListing = $derived.by(() => {
    if (ctx.isLoadingListings) return null;
    return (
      sortedListings.find((listing) => listing.id === selectedListingId) ||
      sortedListings[0] ||
      null
    );
  });
</script>

<div class="min-h-[calc(100vh-var(--nav-height,2.75rem))] bg-app-bg text-app-fg">
  <AnaliseQuerySync />
  <WorkspaceListingQuerySync />

  <div class={cn(WORKSPACE_CONTENT_CLASS, WORKSPACE_STACK_CLASS, "min-w-0")}>
    {#if !ctx.activeCollection}
      <p class="text-sm text-app-muted">
        Crie uma coleção em
        <a href="/anuncios" class="font-medium text-app-fg underline">Anúncios</a>
        para começar.
      </p>
    {:else if ctx.isLoadingListings}
      <p class="text-sm text-app-muted">Carregando imóveis...</p>
    {:else if sortedListings.length === 0}
      <p class="text-sm text-app-muted">
        Nenhum imóvel nesta coleção. Adicione anúncios em
        <a href="/anuncios" class="underline">Anúncios</a>.
      </p>
    {:else if !selectedListing}
      <p class="text-sm text-app-muted">Selecione um imóvel acima.</p>
    {:else}
      <AnaliseTabbedDossier
        listing={selectedListing}
        collectionId={ctx.activeCollection.id}
        {orgId}
        {showDeepAnalysis}
      />
    {/if}
  </div>
</div>
