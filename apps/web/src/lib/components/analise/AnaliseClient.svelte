<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import AnaliseQuerySync from "$lib/components/analise/AnaliseQuerySync.svelte";
  import DeepAnalysisPanel from "$lib/components/analise/DeepAnalysisPanel.svelte";
  import PropertyDossier from "$lib/components/analise/PropertyDossier.svelte";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import { getAdminFeatureFlag, readAdminFeatureFlags } from "$lib/admin/client";
  import { getActiveOrganizationId } from "$lib/api/client";
  import { cn } from "$lib/utils";
  import { WORKSPACE_CONTENT_CLASS, WORKSPACE_STACK_CLASS } from "$lib/workspace-chrome";

  const ctx = getCollectionsContext();

  let { isAdmin = false } = $props<{ isAdmin?: boolean }>();

  let storedFlags = $state<ReturnType<typeof readAdminFeatureFlags>>(readAdminFeatureFlags(false));
  const showDeepAnalysis = $derived(
    getAdminFeatureFlag(storedFlags, "deepAnalysis", isAdmin)
  );

  $effect(() => {
    storedFlags = readAdminFeatureFlags(isAdmin);
  });

  onMount(() => {
    const syncFlags = () => {
      storedFlags = readAdminFeatureFlags(isAdmin);
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
      <PropertyDossier
        listing={selectedListing}
        collectionId={ctx.activeCollection.id}
        {orgId}
      />
      {#if showDeepAnalysis}
        <DeepAnalysisPanel listing={selectedListing} {orgId} />
      {/if}
    {/if}
  </div>
</div>
