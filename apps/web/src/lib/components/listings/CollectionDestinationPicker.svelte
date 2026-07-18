<script lang="ts">
  import { FolderOpen } from "@lucide/svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import type { Collection } from "$lib/listings/types";
  import { cn } from "$lib/utils";

  export type DestinationMode = "existing" | "new";

  let {
    collections,
    mode,
    onModeChange,
    selectedCollectionId,
    onSelectedCollectionIdChange,
    newCollectionName,
    onNewCollectionNameChange,
    disabled = false,
    destinationLabel = "Salvar em",
    showNewCollectionNameField = true,
    newCollectionHint
  } = $props<{
    collections: Collection[];
    mode: DestinationMode;
    onModeChange: (mode: DestinationMode) => void;
    selectedCollectionId: string;
    onSelectedCollectionIdChange: (id: string) => void;
    newCollectionName: string;
    onNewCollectionNameChange: (name: string) => void;
    disabled?: boolean;
    destinationLabel?: string;
    showNewCollectionNameField?: boolean;
    newCollectionHint?: string;
  }>();
</script>

<div class="space-y-3">
  <div class="flex items-center gap-2 text-xs text-muted-foreground">
    <FolderOpen class="h-4 w-4 shrink-0" />
    <span>{destinationLabel}</span>
  </div>

  <div class="space-y-2">
    <span class="text-sm text-app-muted">Coleção de destino</span>
    <div class="flex gap-2">
      <button
        type="button"
        disabled={disabled || collections.length === 0}
        class={cn(
          "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
          mode === "existing"
            ? "border-app-action bg-app-action/20 text-app-accent"
            : "border-app-border bg-app-surface-muted hover:border-app-border-strong"
        )}
        onclick={() => onModeChange("existing")}
      >
        Coleção existente
      </button>
      <button
        type="button"
        disabled={disabled}
        class={cn(
          "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
          mode === "new"
            ? "border-app-action bg-app-action/20 text-app-accent"
            : "border-app-border bg-app-surface-muted hover:border-app-border-strong"
        )}
        onclick={() => onModeChange("new")}
      >
        Nova coleção
      </button>
    </div>
  </div>

  {#if mode === "existing"}
    <div class="space-y-2">
      <label for="destination-collection" class="text-sm text-app-muted">Selecione a coleção</label>
      <select
        id="destination-collection"
        value={selectedCollectionId}
        disabled={disabled}
        class="w-full rounded-lg border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-fg focus:border-app-action focus:outline-none disabled:opacity-50"
        onchange={(event) => onSelectedCollectionIdChange(event.currentTarget.value)}
      >
        <option value="">Selecione uma coleção...</option>
        {#each collections as collection (collection.id)}
          <option value={collection.id}>{collection.name}</option>
        {/each}
      </select>
    </div>
  {:else if showNewCollectionNameField}
    <div class="space-y-2">
      <label for="new-collection-name" class="text-sm text-app-muted">Nome da nova coleção</label>
      <Input
        id="new-collection-name"
        value={newCollectionName}
        disabled={disabled}
        placeholder="Ex: Meus Imóveis 2026"
        class="border-app-border bg-app-surface-muted"
        oninput={(event) => onNewCollectionNameChange(event.currentTarget.value)}
      />
    </div>
  {:else if newCollectionHint}
    <p class="text-xs text-muted-foreground">{newCollectionHint}</p>
  {/if}
</div>
