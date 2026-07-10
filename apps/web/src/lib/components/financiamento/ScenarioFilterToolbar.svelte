<script lang="ts">
  import SimulatorScenarioChips from "$lib/components/financiamento/SimulatorScenarioChips.svelte";
  import SimulatorScenarioSavePopover from "$lib/components/financiamento/SimulatorScenarioSavePopover.svelte";
  import FinanceiroSuggestionsPopover from "$lib/components/financiamento/FinanceiroSuggestionsPopover.svelte";
  import FinanceiroSharePopover from "$lib/components/financiamento/FinanceiroSharePopover.svelte";
  import type { FinanceiroSuggestionResult } from "$lib/financiamento/financeiro-suggestions";
  import type { FinanceiroComparisonGroupPayload } from "$lib/financiamento/shared-snapshot";
  import type { SimulatorScenarioSnapshot } from "$lib/financiamento/simulator-scenarios-storage";
  import type { ScenarioCollectionDestination } from "$lib/financiamento/scenario-collection-destinations";
  import { workspacePageToolbarRowClass } from "$lib/workspace-chrome";
  import { cn } from "$lib/utils";

  let {
    scenarios,
    activeScenarioId = null,
    draftComparisonGroup = null,
    draftActive = false,
    scenarioDestinations = [],
    activeCollectionId = null,
    suggestedScenarioName,
    canCreateScenario = true,
    onRestoreScenario,
    onCreateScenario,
    onDeleteScenario,
    onRenameScenario,
    onMergeScenarios,
    onAddScenarioToDraft,
    onActivateDraft,
    onDiscardDraft,
    suggestions = [],
    onCompareSuggestion,
    onCompareBestSuggestions,
    suggestedShareTitle = "Simulação financeira",
    onCreateShare
  }: {
    scenarios: SimulatorScenarioSnapshot[];
    activeScenarioId?: string | null;
    draftComparisonGroup?: FinanceiroComparisonGroupPayload | null;
    draftActive?: boolean;
    scenarioDestinations?: ScenarioCollectionDestination[];
    activeCollectionId?: string | null;
    suggestedScenarioName: string;
    canCreateScenario?: boolean;
    onRestoreScenario: (id: string) => void | Promise<void>;
    onCreateScenario: (
      name: string,
      destination: ScenarioCollectionDestination
    ) => void | Promise<void>;
    onDeleteScenario: (id: string) => void | Promise<void>;
    onRenameScenario: (id: string, name: string) => void | Promise<void>;
    onMergeScenarios: (sourceId: string, targetId: string) => void;
    onAddScenarioToDraft: (sourceId: string) => void;
    onActivateDraft: () => void;
    onDiscardDraft: () => void;
    suggestions?: FinanceiroSuggestionResult[];
    onCompareSuggestion?: (suggestion: FinanceiroSuggestionResult) => void;
    onCompareBestSuggestions?: (suggestions: FinanceiroSuggestionResult[]) => void;
    suggestedShareTitle?: string;
    onCreateShare?: (title: string) => Promise<string>;
  } = $props();

  let saveOpen = $state(false);
</script>

<header class={cn(workspacePageToolbarRowClass, "z-[55] w-full justify-between gap-2")}>
  <SimulatorScenarioChips
    {scenarios}
    {activeScenarioId}
    {draftComparisonGroup}
    {draftActive}
    {onRestoreScenario}
    {onDeleteScenario}
    {onRenameScenario}
    onOpenSave={() => (saveOpen = true)}
    {onMergeScenarios}
    {onAddScenarioToDraft}
    {onActivateDraft}
    {onDiscardDraft}
  />

  <div class="flex items-center gap-2">
    {#if onCompareSuggestion && onCompareBestSuggestions}
      <FinanceiroSuggestionsPopover
        {suggestions}
        onCompareSuggestion={onCompareSuggestion}
        onCompareBest={onCompareBestSuggestions}
      />
    {/if}

    {#if onCreateShare}
      <FinanceiroSharePopover suggestedTitle={suggestedShareTitle} onCreate={onCreateShare} />
    {/if}

    <SimulatorScenarioSavePopover
      bind:open={saveOpen}
      suggestedName={suggestedScenarioName}
      canCreate={canCreateScenario}
      destinations={scenarioDestinations}
      {activeCollectionId}
      onCreate={onCreateScenario}
    />
  </div>
</header>
