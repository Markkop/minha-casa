<script lang="ts">
  import { Plus } from "@lucide/svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import {
    ADD_COLUMN_PRESETS,
    type ImageEnvironmentKind
  } from "$lib/listing-image-environments";

  let {
    disabled = false,
    onAdd
  }: {
    disabled?: boolean;
    onAdd: (kind: ImageEnvironmentKind, label: string) => void;
  } = $props();

  let menuOpen = $state(false);

  function handleAdd(kind: ImageEnvironmentKind, label: string) {
    menuOpen = false;
    onAdd(kind, label);
  }
</script>

<div class="relative">
  <Button
    type="button"
    variant="outline"
    size="sm"
    class="h-8 gap-1.5 text-xs"
    {disabled}
    onclick={() => (menuOpen = !menuOpen)}
  >
    <Plus class="size-3.5" />
    Adicionar cômodo
  </Button>

  {#if menuOpen}
    <div
      class="absolute bottom-full left-0 z-10 mb-1 min-w-44 rounded-md border border-app-border bg-app-surface py-1 shadow-lg"
      role="menu"
    >
      {#each ADD_COLUMN_PRESETS as preset (preset.kind + preset.label)}
        <button
          type="button"
          role="menuitem"
          class="block w-full px-3 py-1.5 text-left text-xs text-app-fg hover:bg-app-bg"
          onclick={() => handleAdd(preset.kind, preset.label)}
        >
          {preset.label}
        </button>
      {/each}
    </div>
  {/if}
</div>

<svelte:window onclick={() => (menuOpen = false)} />
