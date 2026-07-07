<script lang="ts">
  import { Bookmark } from "@lucide/svelte";
  import PageToolbarButton from "$lib/components/page-toolbar/PageToolbarButton.svelte";
  import PageToolbarIconButton from "$lib/components/page-toolbar/PageToolbarIconButton.svelte";
  import ToolbarAnchoredPopover from "$lib/components/anuncios/ToolbarAnchoredPopover.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import type { ScenarioCollectionDestination } from "$lib/financiamento/scenario-collection-destinations";

  let {
    open = $bindable(false),
    suggestedName,
    canCreate = true,
    destinations = [],
    activeCollectionId = null,
    onCreate
  }: {
    open?: boolean;
    suggestedName: string;
    canCreate?: boolean;
    destinations?: ScenarioCollectionDestination[];
    activeCollectionId?: string | null;
    onCreate: (name: string, destination: ScenarioCollectionDestination) => void | Promise<void>;
  } = $props();

  let name = $state("");
  let selectedCollectionId = $state("");
  const selectedDestination = $derived(
    destinations.find((destination) => destination.collection.id === selectedCollectionId) ?? null
  );
  const selectedCollectionLimitReached = $derived(
    Boolean(activeCollectionId && selectedCollectionId === activeCollectionId && !canCreate)
  );
  const canSubmit = $derived(
    Boolean(name.trim() && selectedDestination && !selectedCollectionLimitReached)
  );

  $effect(() => {
    if (!open) return;
    name = suggestedName;
    selectedCollectionId =
      destinations.find((destination) => destination.collection.id === activeCollectionId)?.collection.id ??
      destinations[0]?.collection.id ??
      "";
  });

  function close() {
    open = false;
  }

  function submit() {
    const trimmed = name.trim();
    if (!trimmed || !selectedDestination) return;
    void onCreate(trimmed, selectedDestination);
    close();
  }
</script>

<ToolbarAnchoredPopover bind:open align="end" panelClass="w-80 p-2">
  {#snippet trigger()}
    <PageToolbarIconButton
      variant="secondary"
      aria-label="Salvar cenário"
      title="Salvar cenário"
      tooltipDisabled={open}
      onclick={() => (open = !open)}
    >
      <Bookmark />
    </PageToolbarIconButton>
  {/snippet}

  <p class="px-1 pb-2 text-[11px] leading-snug text-app-subtle">
    Salve os parâmetros, filtros e seleções de gráficos atuais em um cenário.
  </p>

  <label class="flex flex-col gap-1 px-1">
    <span class="text-xs font-medium text-app-muted">Nome</span>
    <Input
      bind:value={name}
      class="h-8 py-0 text-sm"
      ariaLabel="Nome do cenário"
      onkeydown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          submit();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          close();
        }
      }}
    />
  </label>

  <label class="mt-2 flex flex-col gap-1 px-1">
    <span class="text-xs font-medium text-app-muted">Coleção</span>
    <select
      bind:value={selectedCollectionId}
      class="h-8 rounded-md border border-app-border bg-app-surface px-2 text-sm text-app-fg"
      disabled={destinations.length === 0}
    >
      <option value="">Selecione uma coleção...</option>
      {#each destinations as destination (destination.collection.id)}
        <option value={destination.collection.id}>{destination.label}</option>
      {/each}
    </select>
  </label>

  <div class="mt-2 flex flex-col gap-1">
    <PageToolbarButton
      variant="primary"
      class="h-8 w-full"
      disabled={!canSubmit}
      onclick={submit}
    >
      Salvar cenário
    </PageToolbarButton>
  </div>

  {#if destinations.length === 0}
    <p class="mt-2 px-1 text-[11px] text-destructive">
      Crie uma coleção antes de salvar cenários.
    </p>
  {:else if selectedCollectionLimitReached}
    <p class="mt-2 px-1 text-[11px] text-destructive">
      Limite de 20 cenários atingido.
    </p>
  {/if}
</ToolbarAnchoredPopover>
