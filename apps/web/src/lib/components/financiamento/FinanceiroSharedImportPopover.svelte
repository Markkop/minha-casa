<script lang="ts">
  import { Check, Download, Loader2 } from "@lucide/svelte";
  import { goto } from "$app/navigation";
  import PageToolbarButton from "$lib/components/page-toolbar/PageToolbarButton.svelte";
  import ToolbarAnchoredPopover from "$lib/components/listings/ToolbarAnchoredPopover.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import { setActiveOrganizationId } from "$lib/api/client";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import {
    findScenarioCollectionDestination,
    loadScenarioCollectionDestinations,
    type ScenarioCollectionDestination
  } from "$lib/financiamento/scenario-collection-destinations";
  import { importSharedScenarioSnapshot } from "$lib/financiamento/simulator-scenarios-storage";

  let {
    token,
    suggestedName = "Simulação financeira"
  }: {
    token: string;
    suggestedName?: string;
  } = $props();

  const ctx = getCollectionsContext();

  let open = $state(false);
  let destinations = $state.raw<ScenarioCollectionDestination[]>([]);
  let loadingDestinations = $state(false);
  let selectedCollectionId = $state("");
  let name = $state("");
  let status = $state<"idle" | "importing" | "success" | "error">("idle");
  let error = $state("");
  let importedCollectionId = $state<string | null>(null);
  let importedOrganizationId = $state<string | null>(null);

  const busy = $derived(status === "importing");
  const selectedDestination = $derived(
    findScenarioCollectionDestination(destinations, selectedCollectionId)
  );
  const canImport = $derived(Boolean(selectedDestination) && name.trim().length > 0 && !busy);

  $effect(() => {
    if (!open) return;
    name = suggestedName;
    status = "idle";
    error = "";
    importedCollectionId = null;
    importedOrganizationId = null;
    loadingDestinations = true;
    void loadScenarioCollectionDestinations()
      .then((loaded) => {
        destinations = loaded;
        selectedCollectionId =
          loaded.find((destination) => destination.collection.id === ctx.activeCollection?.id)
            ?.collection.id ??
          loaded[0]?.collection.id ??
          "";
      })
      .catch(() => {
        destinations = ctx.collections.map((collection) => ({
          collection,
          organizationId: collection.orgId ?? null,
          profileLabel: collection.orgId ? "Família ou imobiliária" : "Pessoal",
          label: collection.name
        }));
        selectedCollectionId = ctx.activeCollection?.id ?? destinations[0]?.collection.id ?? "";
      })
      .finally(() => {
        loadingDestinations = false;
      });
  });

  async function importScenario() {
    if (!canImport) return;
    status = "importing";
    error = "";

    try {
      const imported = await importSharedScenarioSnapshot({
        collectionId: selectedCollectionId,
        organizationId: selectedDestination?.organizationId ?? null,
        token,
        name
      });
      importedCollectionId = imported?.collectionId ?? selectedCollectionId;
      importedOrganizationId = selectedDestination?.organizationId ?? null;
      status = "success";
    } catch (err) {
      error = err instanceof Error ? err.message : "Não foi possível importar o cenário.";
      status = "error";
    }
  }

  async function openFinanceiro() {
    if (!importedCollectionId) return;
    await setActiveOrganizationId(importedOrganizationId);
    void goto(`/financeiro?collection=${encodeURIComponent(importedCollectionId)}`);
  }
</script>

<ToolbarAnchoredPopover bind:open align="end" panelClass="w-80 p-2">
  {#snippet trigger()}
    <PageToolbarButton
      variant="secondary"
      class="h-8 shrink-0 px-3"
      aria-label="Importar cenário compartilhado"
      title="Importar cenário"
      tooltipDisabled={open}
      onclick={() => (open = !open)}
    >
      <Download />
      <span class="hidden sm:inline">Importar</span>
    </PageToolbarButton>
  {/snippet}

  <p class="px-1 pb-2 text-[11px] leading-snug text-app-subtle">
    Salve este cenário em uma coleção existente.
  </p>

  <label class="flex flex-col gap-1 px-1">
    <span class="text-xs font-medium text-app-muted">Nome</span>
    <Input
      bind:value={name}
      class="h-8 py-0 text-sm"
      ariaLabel="Nome do cenário importado"
      disabled={busy}
    />
  </label>

  <label class="mt-2 flex flex-col gap-1 px-1">
    <span class="text-xs font-medium text-app-muted">Coleção</span>
    <select
      bind:value={selectedCollectionId}
      disabled={busy || loadingDestinations || destinations.length === 0}
      class="h-8 rounded-md border border-app-border bg-app-surface px-2 text-sm text-app-fg"
    >
      <option value="">Selecione uma coleção...</option>
      {#each destinations as destination (destination.collection.id)}
        <option value={destination.collection.id}>{destination.label}</option>
      {/each}
    </select>
  </label>

  {#if !loadingDestinations && destinations.length === 0}
    <p class="mt-2 px-1 text-[11px] text-app-subtle">
      Crie uma coleção antes de importar este cenário.
    </p>
  {/if}

  {#if error}
    <p class="mt-2 px-1 text-[11px] text-destructive">{error}</p>
  {/if}

  {#if status === "success"}
    <div class="mt-2 rounded-md border border-app-border bg-app-bg p-2 text-xs text-app-muted">
      <p class="flex items-center gap-1 font-medium text-app-accent">
        <Check class="size-3.5" />
        Cenário importado.
      </p>
      <button
        type="button"
        class="mt-2 w-full rounded-md border border-app-border bg-app-surface py-1.5 text-sm text-app-fg hover:bg-app-surface-muted"
        onclick={openFinanceiro}
      >
        Abrir no Financeiro
      </button>
    </div>
  {:else}
    <PageToolbarButton
      variant="primary"
      class="mt-2 h-8 w-full"
      disabled={!canImport}
      onclick={() => void importScenario()}
    >
      {#if busy}
        <Loader2 class="animate-spin" />
        Importando...
      {:else}
        Importar cenário
      {/if}
    </PageToolbarButton>
  {/if}
</ToolbarAnchoredPopover>
