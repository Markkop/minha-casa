<script lang="ts">
  import { ArrowLeft, Copy, Loader2 } from "@lucide/svelte";
  import { formatApiError } from "$lib/api/error-message";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import type { CollectionDestination } from "$lib/workspace/collection-destinations";
  import { loadWritableCollectionDestinations } from "$lib/workspace/collection-destinations";
  import { cn } from "$lib/utils";

  let {
    listingId,
    listingTitle,
    sourceCollectionId,
    onBack,
    onCopied
  }: {
    listingId: string;
    listingTitle: string;
    sourceCollectionId: string;
    onBack: () => void;
    onCopied: (destination: CollectionDestination) => void;
  } = $props();

  const ctx = getCollectionsContext();

  let destinations = $state.raw<CollectionDestination[]>([]);
  let selectedWorkspaceId = $state("");
  let selectedCollectionId = $state("");
  let loading = $state(true);
  let copying = $state(false);
  let error = $state<string | null>(null);

  const profiles = $derived.by(() => {
    const unique = new Map<string, { workspaceId: string; label: string }>();
    for (const destination of destinations) {
      if (!unique.has(destination.workspaceId)) {
        unique.set(destination.workspaceId, {
          workspaceId: destination.workspaceId,
          label: destination.profileLabel
        });
      }
    }
    return [...unique.values()];
  });

  const profileCollections = $derived(
    destinations.filter((destination) => destination.workspaceId === selectedWorkspaceId)
  );

  $effect(() => {
    let cancelled = false;
    loading = true;
    error = null;

    void loadWritableCollectionDestinations({ excludeCollectionId: sourceCollectionId })
      .then((loaded) => {
        if (cancelled) return;
        destinations = loaded;
      })
      .catch((cause) => {
        if (cancelled) return;
        destinations = [];
        error = formatApiError(cause, { action: "carregar coleções de destino" });
      })
      .finally(() => {
        if (!cancelled) loading = false;
      });

    return () => {
      cancelled = true;
    };
  });

  function handleProfileChange(value: string) {
    selectedWorkspaceId = value;
    selectedCollectionId = "";
    error = null;
  }

  async function handleCopy() {
    if (copying || !selectedCollectionId) return;
    const destination = destinations.find(
      (item) => item.collection.id === selectedCollectionId
    );
    if (!destination) return;

    copying = true;
    error = null;
    try {
      await ctx.copyListingToCollection(listingId, destination.collection.id);
      onCopied(destination);
    } catch (cause) {
      error = formatApiError(cause, { action: "copiar imóvel" });
    } finally {
      copying = false;
    }
  }
</script>

<div class="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-5">
  <div class="space-y-5">
    <div class="space-y-2">
      <span class="text-sm text-app-muted">Imóvel original</span>
      <p class="rounded-lg border border-app-border bg-app-surface-muted px-3 py-2 text-sm">
        {listingTitle}
      </p>
    </div>

    {#if loading}
      <div class="flex items-center justify-center gap-2 py-8 text-sm text-app-muted">
        <Loader2 class="h-4 w-4 animate-spin" />
        Carregando perfis e coleções...
      </div>
    {:else if destinations.length === 0 && !error}
      <div class="rounded-lg border border-app-border bg-app-surface-muted p-4 text-sm text-app-muted">
        Nenhuma outra coleção disponível para receber este imóvel.
      </div>
    {:else}
      <div class="space-y-2">
        <label for="listing-copy-profile" class="text-sm text-app-muted">Perfil de destino</label>
        <select
          id="listing-copy-profile"
          value={selectedWorkspaceId}
          onchange={(event) => handleProfileChange(event.currentTarget.value)}
          class="w-full rounded-lg border border-app-border bg-app-surface-muted px-3 py-2.5 text-sm text-app-fg"
        >
          <option value="">Selecione um perfil</option>
          {#each profiles as profile (profile.workspaceId)}
            <option value={profile.workspaceId}>{profile.label}</option>
          {/each}
        </select>
      </div>

      <div class="space-y-2">
        <label for="listing-copy-collection" class="text-sm text-app-muted">Coleção de destino</label>
        <select
          id="listing-copy-collection"
          bind:value={selectedCollectionId}
          disabled={!selectedWorkspaceId}
          class="w-full rounded-lg border border-app-border bg-app-surface-muted px-3 py-2.5 text-sm text-app-fg disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="">Selecione uma coleção</option>
          {#each profileCollections as destination (destination.collection.id)}
            <option value={destination.collection.id}>{destination.collection.name}</option>
          {/each}
        </select>
      </div>
    {/if}

    {#if error}
      <div class="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
        <p class="text-sm text-destructive">{error}</p>
      </div>
    {/if}
  </div>
</div>

<div class="flex shrink-0 gap-3 border-t border-app-border px-6 py-4">
  <button
    type="button"
    onclick={onBack}
    disabled={copying}
    class={cn(
      "flex flex-1 items-center justify-center gap-2 rounded-lg border border-app-border px-4 py-2.5 font-medium transition-all",
      "bg-app-surface-muted text-app-fg hover:border-app-action hover:text-app-accent",
      "disabled:cursor-not-allowed disabled:opacity-60"
    )}
  >
    <ArrowLeft class="h-4 w-4" />
    Voltar
  </button>
  <button
    type="button"
    onclick={() => void handleCopy()}
    disabled={copying || loading || !selectedCollectionId}
    aria-busy={copying}
    class={cn(
      "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-medium transition-all",
      "bg-app-action text-app-action-foreground hover:bg-app-action-hover",
      "disabled:cursor-not-allowed disabled:opacity-60"
    )}
  >
    {#if copying}<Loader2 class="h-4 w-4 animate-spin" />{:else}<Copy class="h-4 w-4" />{/if}
    {copying ? "Copiando..." : "Copiar"}
  </button>
</div>
