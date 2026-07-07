<script lang="ts">
  import type { Component } from "svelte";
  import {
    Bookmark,
    Check,
    Circle,
    CircleDot,
    Diamond,
    Hexagon,
    Pencil,
    Sparkles,
    Square,
    Star,
    Trash2,
    Triangle,
    X
  } from "@lucide/svelte";
  import PageToolbarButton from "$lib/components/page-toolbar/PageToolbarButton.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import {
    scenarioChartColor,
    scenarioColorIndexMap
  } from "$lib/components/financiamento/charts/chart-shared";
  import {
    buildComparisonGroupCenarios,
    buildFilteredCenariosFromParams
  } from "$lib/financiamento/scenario-graph-view";
  import type {
    FinanceiroComparisonGroupPayload,
    FinanceiroComparisonSourceSnapshot
  } from "$lib/financiamento/shared-snapshot";
  import type { SimulatorScenarioSnapshot } from "$lib/financiamento/simulator-scenarios-storage";
  import { cn } from "$lib/utils";

  let {
    scenarios,
    activeScenarioId = null,
    draftComparisonGroup = null,
    draftActive = false,
    onRestoreScenario,
    onDeleteScenario,
    onRenameScenario,
    onOpenSave,
    onMergeScenarios,
    onAddScenarioToDraft,
    onActivateDraft,
    onDiscardDraft
  }: {
    scenarios: SimulatorScenarioSnapshot[];
    activeScenarioId?: string | null;
    draftComparisonGroup?: FinanceiroComparisonGroupPayload | null;
    draftActive?: boolean;
    onRestoreScenario: (id: string) => void | Promise<void>;
    onDeleteScenario: (id: string) => void | Promise<void>;
    onRenameScenario: (id: string, name: string) => void | Promise<void>;
    onOpenSave: () => void;
    onMergeScenarios: (sourceId: string, targetId: string) => void;
    onAddScenarioToDraft: (sourceId: string) => void;
    onActivateDraft: () => void;
    onDiscardDraft: () => void;
  } = $props();

  let renamingId = $state<string | null>(null);
  let renameValue = $state("");
  let renamingFormElement = $state<HTMLFormElement | null>(null);
  let draggingScenarioId = $state<string | null>(null);
  let dropScenarioId = $state<string | null>(null);
  let draftDropActive = $state(false);

  const SCENARIO_ICON_POOL: Component<{ class?: string }>[] = [
    Circle,
    Square,
    Triangle,
    Diamond,
    Hexagon,
    Star,
    CircleDot,
    Sparkles
  ];

  function hashScenarioId(id: string): number {
    let hash = 0;
    for (let index = 0; index < id.length; index += 1) {
      hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
    }
    return hash;
  }

  function scenarioIcon(id: string): Component<{ class?: string }> {
    return SCENARIO_ICON_POOL[hashScenarioId(id) % SCENARIO_ICON_POOL.length] ?? Circle;
  }

  function graphColorFromParams(params: SimulatorScenarioSnapshot["params"]): string {
    const lines = buildFilteredCenariosFromParams(params);
    const hidden = new Set(params.cenariosOcultosGraficos);
    const colorSource = lines.find((line) => !hidden.has(line.id)) ?? lines[0];
    if (!colorSource) return "currentColor";
    return scenarioChartColor(colorSource.id, scenarioColorIndexMap(lines));
  }

  function graphColorFromComparisonGroup(group: FinanceiroComparisonGroupPayload): string {
    const lines = buildComparisonGroupCenarios(group);
    const colorSource = lines[0];
    if (!colorSource) return "currentColor";
    return scenarioChartColor(colorSource.id, scenarioColorIndexMap(lines));
  }

  function scenarioGraphColor(scenario: SimulatorScenarioSnapshot): string {
    return scenario.payload.comparisonGroup
      ? graphColorFromComparisonGroup(scenario.payload.comparisonGroup)
      : graphColorFromParams(scenario.params);
  }

  function sourceGraphColor(source: FinanceiroComparisonSourceSnapshot): string {
    return graphColorFromParams(source.payload.params);
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

  function handleWindowPointerDown(event: PointerEvent) {
    if (!renamingId || !renamingFormElement) return;
    const target = event.target;
    if (target instanceof Node && renamingFormElement.contains(target)) return;
    cancelRename();
  }

  function scenarioIdFromDrag(event: DragEvent): string | null {
    const id = event.dataTransfer?.getData("text/plain")?.trim();
    return id || draggingScenarioId;
  }

  function handleDragStart(id: string, event: DragEvent) {
    draggingScenarioId = id;
    event.dataTransfer?.setData("text/plain", id);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
    }
  }

  function handleDragEnd() {
    draggingScenarioId = null;
    dropScenarioId = null;
    draftDropActive = false;
  }

  function handleScenarioDragOver(targetId: string, event: DragEvent) {
    const sourceId = scenarioIdFromDrag(event);
    if (!sourceId || sourceId === targetId) return;
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
    dropScenarioId = targetId;
  }

  function handleScenarioDrop(targetId: string, event: DragEvent) {
    event.preventDefault();
    const sourceId = scenarioIdFromDrag(event);
    handleDragEnd();
    if (!sourceId || sourceId === targetId) return;
    onMergeScenarios(sourceId, targetId);
  }

  function handleDraftDragOver(event: DragEvent) {
    const sourceId = scenarioIdFromDrag(event);
    if (!sourceId || draftComparisonGroup?.sources.some((source) => source.id === sourceId)) {
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
    draftDropActive = true;
  }

  function handleDraftDrop(event: DragEvent) {
    event.preventDefault();
    const sourceId = scenarioIdFromDrag(event);
    handleDragEnd();
    if (!sourceId) return;
    onAddScenarioToDraft(sourceId);
  }
</script>

<svelte:window onpointerdown={handleWindowPointerDown} />

<div class="flex min-w-0 flex-1 flex-wrap items-center gap-1.5" role="list">
  {#if scenarios.length === 0 && !draftComparisonGroup}
    <span class="text-xs text-app-subtle">Nenhum cenário salvo</span>
  {/if}

  {#each scenarios as scenario (scenario.id)}
    {@const ScenarioIcon = scenarioIcon(scenario.id)}
    {@const scenarioIconColor = scenarioGraphColor(scenario)}
    {#if renamingId === scenario.id}
      <form
        bind:this={renamingFormElement}
        class="flex h-8 min-w-44 items-center gap-1 rounded-md border border-app-border bg-app-surface px-1"
        onsubmit={(event) => {
          event.preventDefault();
          commitRename(scenario.id);
        }}
      >
        <span class="ml-1 inline-flex shrink-0" style:color={scenarioIconColor}>
          <ScenarioIcon class="size-3.5 shrink-0" />
        </span>
        <Input
          bind:value={renameValue}
          class="h-6 min-w-0 flex-1 py-0 text-xs"
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
          class="h-6 w-6 shrink-0 px-0"
          aria-label="Confirmar renomeação"
        >
          <Check />
        </PageToolbarButton>
        <PageToolbarButton
          type="button"
          variant="ghost"
          class="h-6 w-6 shrink-0 px-0 text-destructive hover:text-destructive"
          aria-label={`Excluir ${scenario.name}`}
          onclick={(event) => handleDelete(scenario.id, event)}
        >
          <Trash2 />
        </PageToolbarButton>
      </form>
    {:else}
      <div
        role="listitem"
        class={cn(
          "group flex h-8 max-w-64 items-center gap-1 rounded-md border bg-app-surface px-1 transition-colors",
          activeScenarioId === scenario.id && !draftActive
            ? "border-app-action bg-app-action/10 text-app-fg"
            : "border-app-border text-app-muted hover:border-app-action/60 hover:text-app-fg",
          dropScenarioId === scenario.id && "border-dashed border-app-action bg-app-action/10"
        )}
        ondragover={(event) => handleScenarioDragOver(scenario.id, event)}
        ondragleave={() => {
          if (dropScenarioId === scenario.id) dropScenarioId = null;
        }}
        ondrop={(event) => handleScenarioDrop(scenario.id, event)}
      >
        <button
          type="button"
          draggable="true"
          class="flex min-w-0 flex-1 cursor-grab items-center gap-1.5 px-1.5 text-left text-xs font-medium active:cursor-grabbing"
          title={scenario.name}
          onclick={() => void onRestoreScenario(scenario.id)}
          ondragstart={(event) => handleDragStart(scenario.id, event)}
          ondragend={handleDragEnd}
        >
          <span class="inline-flex shrink-0" style:color={scenarioIconColor}>
            <ScenarioIcon class="size-3.5 shrink-0" />
          </span>
          <span class="truncate">{scenario.name}</span>
        </button>
        <PageToolbarButton
          variant="ghost"
          class="pointer-events-none h-6 w-0 shrink-0 overflow-hidden px-0 opacity-0 transition-[width,opacity] group-hover:pointer-events-auto group-hover:w-6 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:w-6 group-focus-within:opacity-100"
          aria-label={`Renomear ${scenario.name}`}
          onclick={(event) => startRename(scenario, event)}
        >
          <Pencil />
        </PageToolbarButton>
      </div>
    {/if}
  {/each}

  {#if draftComparisonGroup}
    <div
      role="listitem"
      class={cn(
        "group flex h-8 max-w-80 items-center gap-1 rounded-md border border-dashed bg-app-action/5 px-1 text-app-muted transition-colors hover:text-app-fg",
        draftActive ? "border-app-action text-app-fg" : "border-app-border",
        draftDropActive && "bg-app-action/10"
      )}
      ondragover={handleDraftDragOver}
      ondragleave={() => (draftDropActive = false)}
      ondrop={handleDraftDrop}
    >
      <button
        type="button"
        class="flex min-w-0 flex-1 items-center gap-1.5 px-1.5 text-left text-xs font-medium"
        title={draftComparisonGroup.name}
        aria-label={draftComparisonGroup.name}
        onclick={onActivateDraft}
      >
        {#each draftComparisonGroup.sources as source, index (source.id)}
          {@const SourceIcon = scenarioIcon(source.id)}
          {@const sourceIconColor = sourceGraphColor(source)}
          {#if index > 0}
            <span class="shrink-0 text-[11px] text-app-subtle">+</span>
          {/if}
          <span class="inline-flex shrink-0" style:color={sourceIconColor}>
            <SourceIcon class="size-3.5 shrink-0" />
          </span>
        {/each}
      </button>
      <PageToolbarButton
        variant="ghost"
        class="h-6 w-6 shrink-0 px-0"
        aria-label="Salvar comparação"
        onclick={onOpenSave}
      >
        <Bookmark />
      </PageToolbarButton>
      <PageToolbarButton
        variant="ghost"
        class="h-6 w-6 shrink-0 px-0"
        aria-label="Descartar comparação"
        onclick={onDiscardDraft}
      >
        <X />
      </PageToolbarButton>
    </div>
  {/if}
</div>
