<script lang="ts">
  import { ListChecks, Plus } from "@lucide/svelte";
  import PageToolbarIconButton from "$lib/components/page-toolbar/PageToolbarIconButton.svelte";
  import ToolbarAnchoredPopover from "$lib/components/anuncios/ToolbarAnchoredPopover.svelte";
  import {
    ensureUniquePreferenceKey,
    slugifyPreferenceKey,
    sortPreferenceCatalog,
    type ListingPreferenceOption
  } from "$lib/anuncios/listing-preferences";
  import { cn } from "$lib/utils";

  let {
    catalog,
    onChange,
    saving = false
  }: {
    catalog: ListingPreferenceOption[];
    onChange: (catalog: ListingPreferenceOption[]) => void | Promise<void>;
    saving?: boolean;
  } = $props();

  let open = $state(false);
  let newLabel = $state("");

  const sortedCatalog = $derived(sortPreferenceCatalog(catalog));

  function toggleVisible(key: string, visible: boolean) {
    onChange(
      catalog.map((option) => (option.key === key ? { ...option, visible } : option))
    );
  }

  function addCustomPreference() {
    const label = newLabel.trim();
    if (!label) return;

    const baseKey = slugifyPreferenceKey(label);
    const key = ensureUniquePreferenceKey(baseKey, catalog);
    const maxSort = catalog.reduce((max, option) => Math.max(max, option.sortOrder), -1);

    onChange([
      ...catalog,
      {
        key,
        label,
        source: "custom",
        visible: true,
        sortOrder: maxSort + 1
      }
    ]);

    newLabel = "";
  }
</script>

<ToolbarAnchoredPopover bind:open align="auto" panelClass="w-64 p-2">
  {#snippet trigger()}
    <PageToolbarIconButton
      variant="secondary"
      aria-label="Preferências"
      title="Preferências"
      tooltipDisabled={open}
      onclick={() => (open = !open)}
    >
      <ListChecks />
    </PageToolbarIconButton>
  {/snippet}

  <div class="flex flex-col gap-2">
    <p class="px-2 text-xs font-medium text-app-fg">Preferências</p>
    <p class="px-2 text-[11px] leading-snug text-app-muted">
      Controla quais preferências aparecem nos chips da listagem. Todas continuam editáveis no imóvel.
    </p>

    <div class="flex max-h-52 flex-col gap-0.5 overflow-y-auto">
      {#each sortedCatalog as option (option.key)}
        <label
          class={cn(
            "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-app-muted transition-colors hover:bg-app-surface-muted hover:text-app-fg",
            saving && "pointer-events-none opacity-60"
          )}
        >
          <input
            type="checkbox"
            checked={option.visible}
            disabled={saving}
            onchange={(event) => toggleVisible(option.key, event.currentTarget.checked)}
            class="h-3.5 w-3.5 accent-app-action"
          />
          <span class="min-w-0 flex-1 truncate">{option.label}</span>
          {#if option.source === "custom"}
            <span class="text-[10px] uppercase tracking-wide text-app-muted/70">custom</span>
          {/if}
        </label>
      {/each}
    </div>

    <div class="border-t border-app-border pt-2">
      <div class="flex gap-1.5 px-1">
        <input
          type="text"
          bind:value={newLabel}
          placeholder="Nova preferência"
          disabled={saving}
          class="min-w-0 flex-1 rounded-md border border-app-border bg-app-surface px-2 py-1.5 text-sm text-app-fg placeholder:text-app-muted focus:outline-none focus:ring-1 focus:ring-app-action"
          onkeydown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addCustomPreference();
            }
          }}
        />
        <button
          type="button"
          class="inline-flex shrink-0 items-center justify-center rounded-md border border-app-border bg-app-surface-muted px-2 text-app-fg transition-colors hover:bg-app-surface disabled:opacity-50"
          disabled={saving || !newLabel.trim()}
          aria-label="Adicionar preferência"
          onclick={addCustomPreference}
        >
          <Plus class="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
</ToolbarAnchoredPopover>
