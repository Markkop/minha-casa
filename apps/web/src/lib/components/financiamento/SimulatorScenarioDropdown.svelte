<script lang="ts">
  import { Check, ChevronDown, DollarSign, Pencil, Trash2 } from "@lucide/svelte";
  import PageToolbarButton from "$lib/components/page-toolbar/PageToolbarButton.svelte";
  import ToolbarAnchoredPopover from "$lib/components/listings/ToolbarAnchoredPopover.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import type { SimulatorScenarioSnapshot } from "$lib/financiamento/simulator-scenarios-storage";
  import { cn } from "$lib/utils";

  let {
    scenarios,
    onRestoreScenario,
    onDeleteScenario,
    onRenameScenario,
    onOpenSave
  }: {
    scenarios: SimulatorScenarioSnapshot[];
    onRestoreScenario: (id: string) => void | Promise<void>;
    onDeleteScenario: (id: string) => void | Promise<void>;
    onRenameScenario: (id: string, name: string) => void | Promise<void>;
    onOpenSave: () => void;
  } = $props();

  let open = $state(false);
  let renamingId = $state<string | null>(null);
  let renameValue = $state("");

  function formatCapturedAt(iso: string): string {
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

  function handleRestore(id: string) {
    void onRestoreScenario(id);
    open = false;
    cancelRename();
  }

  function startRename(scenario: SimulatorScenarioSnapshot, event: MouseEvent) {
    event.stopPropagation();
    renamingId = scenario.id;
    renameValue = scenario.name;
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
    void onRenameScenario(id, nextName);
    cancelRename();
  }

  function handleDelete(id: string, event: MouseEvent) {
    event.stopPropagation();
    void onDeleteScenario(id);
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
      aria-label="Abrir cenários salvos"
      title="Cenários salvos"
      tooltipDisabled={open}
      onclick={() => (open = !open)}
    >
      <DollarSign />
      <span class="truncate">Cenários salvos</span>
      <ChevronDown class="opacity-70" />
    </PageToolbarButton>
  {/snippet}

  {#if scenarios.length === 0}
    <p class="px-2 py-2 text-xs text-app-subtle">Nenhum cenário salvo</p>
  {:else}
    <div class="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
      {#each scenarios as scenario (scenario.id)}
        {#if renamingId === scenario.id}
          <form
            class="flex items-center gap-1 px-1 py-0.5"
            onsubmit={(event) => {
              event.preventDefault();
              commitRename(scenario.id);
            }}
          >
            <Input
              bind:value={renameValue}
              class="h-7 min-w-0 flex-1 py-0 text-xs"
              ariaLabel="Renomear cenário"
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
            class={cn("group flex items-center gap-1 rounded px-1 py-0.5 hover:bg-app-surface-muted")}
          >
            <button
              type="button"
              class="flex min-w-0 flex-1 flex-col items-start rounded px-1 py-1 text-left"
              onclick={() => handleRestore(scenario.id)}
            >
              <span class="flex w-full items-center gap-1.5 text-sm text-app-fg">
                <span class="size-3.5 shrink-0" aria-hidden="true"></span>
                <span class="truncate font-medium">{scenario.name}</span>
              </span>
              <span class="pl-5 text-[11px] text-app-subtle">
                Capturado {formatCapturedAt(scenario.capturedAt)}
              </span>
            </button>
            <PageToolbarButton
              variant="ghost"
              class="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
              aria-label={`Renomear ${scenario.name}`}
              onclick={(event) => startRename(scenario, event)}
            >
              <Pencil />
            </PageToolbarButton>
            <PageToolbarButton
              variant="ghost"
              class="h-7 w-7 shrink-0 text-destructive opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 group-focus-within:opacity-100"
              aria-label={`Excluir ${scenario.name}`}
              onclick={(event) => handleDelete(scenario.id, event)}
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
      Salvar cenário…
    </button>
  </div>
</ToolbarAnchoredPopover>
