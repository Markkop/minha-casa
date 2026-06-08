<script lang="ts">
  import { Check, ChevronDown, DollarSign, Pencil, Trash2 } from "@lucide/svelte";
  import PageToolbarButton from "$lib/components/page-toolbar/PageToolbarButton.svelte";
  import ToolbarAnchoredPopover from "$lib/components/anuncios/ToolbarAnchoredPopover.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import type { SimulatorPreset } from "$lib/financiamento/simulator-presets-storage";
  import { cn } from "$lib/utils";

  let {
    presets,
    activePresetId,
    dirty = false,
    onSelectPreset,
    onDeletePreset,
    onRenamePreset,
    onOpenSave
  }: {
    presets: SimulatorPreset[];
    activePresetId: string | null;
    dirty?: boolean;
    onSelectPreset: (id: string) => void;
    onDeletePreset: (id: string) => void;
    onRenamePreset: (id: string, name: string) => void;
    onOpenSave: () => void;
  } = $props();

  let open = $state(false);
  let renamingId = $state<string | null>(null);
  let renameValue = $state("");

  const activePreset = $derived(presets.find((preset) => preset.id === activePresetId) ?? null);
  const label = $derived(activePreset?.name ?? "Financiamento");

  function formatUpdatedAt(iso: string): string {
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(iso));
    } catch {
      return "";
    }
  }

  function handleSelect(id: string) {
    onSelectPreset(id);
    open = false;
    cancelRename();
  }

  function startRename(preset: SimulatorPreset, event: MouseEvent) {
    event.stopPropagation();
    renamingId = preset.id;
    renameValue = preset.name;
  }

  function cancelRename() {
    renamingId = null;
    renameValue = "";
  }

  function commitRename(id: string) {
    const nextName = renameValue.trim();
    if (!nextName) {
      cancelRename();
      return;
    }
    onRenamePreset(id, nextName);
    cancelRename();
  }

  function handleDelete(id: string, event: MouseEvent) {
    event.stopPropagation();
    onDeletePreset(id);
    if (renamingId === id) {
      cancelRename();
    }
  }

  function handleOpenSave() {
    open = false;
    cancelRename();
    onOpenSave();
  }
</script>

<ToolbarAnchoredPopover bind:open align="start" panelClass="w-72 p-1">
  {#snippet trigger()}
    <PageToolbarButton
      variant="secondary"
      class="h-7 max-w-[12rem] shrink-0 rounded-full px-2"
      aria-label="Selecionar configuração salva"
      title="Configurações salvas"
      tooltipDisabled={open}
      onclick={() => (open = !open)}
    >
      <DollarSign />
      <span class="truncate">
        {label}{#if dirty && activePreset}<span class="text-app-subtle"> *</span>{/if}
      </span>
      <ChevronDown class="opacity-70" />
    </PageToolbarButton>
  {/snippet}

  {#if presets.length === 0}
    <p class="px-2 py-2 text-xs text-app-subtle">Nenhuma configuração salva</p>
  {:else}
    <div class="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
      {#each presets as preset (preset.id)}
        {@const isActive = preset.id === activePresetId}
        {#if renamingId === preset.id}
          <form
            class="flex items-center gap-1 px-1 py-0.5"
            onsubmit={(event) => {
              event.preventDefault();
              commitRename(preset.id);
            }}
          >
            <Input
              bind:value={renameValue}
              class="h-7 min-w-0 flex-1 py-0 text-xs"
              ariaLabel="Renomear configuração"
              onkeydown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  cancelRename();
                }
              }}
            />
            <PageToolbarButton
              type="submit"
              variant="primary"
              class="h-7 shrink-0 px-2"
              aria-label="Confirmar renomeação"
            >
              <Check />
            </PageToolbarButton>
          </form>
        {:else}
          <div
            class={cn(
              "group flex items-center gap-1 rounded px-1 py-0.5",
              isActive ? "bg-app-action/10" : "hover:bg-app-surface-muted"
            )}
          >
            <button
              type="button"
              class="flex min-w-0 flex-1 flex-col items-start rounded px-1 py-1 text-left"
              onclick={() => handleSelect(preset.id)}
            >
              <span class="flex w-full items-center gap-1.5 text-sm text-app-fg">
                {#if isActive}
                  <Check class="size-3.5 shrink-0 text-app-action" />
                {:else}
                  <span class="size-3.5 shrink-0" aria-hidden="true"></span>
                {/if}
                <span class="truncate font-medium">{preset.name}</span>
              </span>
              <span class="pl-5 text-[11px] text-app-subtle">
                Atualizada {formatUpdatedAt(preset.updatedAt)}
              </span>
            </button>
            <PageToolbarButton
              variant="ghost"
              class="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
              aria-label={`Renomear ${preset.name}`}
              onclick={(event) => startRename(preset, event)}
            >
              <Pencil />
            </PageToolbarButton>
            <PageToolbarButton
              variant="ghost"
              class="h-7 w-7 shrink-0 text-destructive opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 group-focus-within:opacity-100"
              aria-label={`Excluir ${preset.name}`}
              onclick={(event) => handleDelete(preset.id, event)}
            >
              <Trash2 />
            </PageToolbarButton>
          </div>
        {/if}
      {/each}
    </div>
  {/if}

  <div class="mt-1 border-t border-app-border pt-1">
    <button
      type="button"
      class="w-full rounded px-2 py-1.5 text-left text-sm text-app-muted transition-colors hover:bg-app-surface-muted hover:text-app-fg"
      onclick={handleOpenSave}
    >
      Salvar configuração atual…
    </button>
  </div>
</ToolbarAnchoredPopover>
