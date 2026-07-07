<script lang="ts">
  import SimulatorScenarioDropdown from "$lib/components/financiamento/SimulatorScenarioDropdown.svelte";
  import SimulatorScenarioSavePopover from "$lib/components/financiamento/SimulatorScenarioSavePopover.svelte";
  import FinanceiroSharePopover from "$lib/components/financiamento/FinanceiroSharePopover.svelte";
  import type { SimulatorScenarioSnapshot } from "$lib/financiamento/simulator-scenarios-storage";
  import type { ScenarioCollectionDestination } from "$lib/financiamento/scenario-collection-destinations";
  import { workspacePageToolbarRowClass } from "$lib/workspace-chrome";
  import { cn } from "$lib/utils";

  let {
    scenarios,
    scenarioDestinations = [],
    activeCollectionId = null,
    suggestedScenarioName,
    canCreateScenario = true,
    onRestoreScenario,
    onCreateScenario,
    onDeleteScenario,
    onRenameScenario,
    suggestedShareTitle = "Simulação financeira",
    onCreateShare
  }: {
    scenarios: SimulatorScenarioSnapshot[];
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
    suggestedShareTitle?: string;
    onCreateShare?: (title: string) => Promise<string>;
  } = $props();

  let saveOpen = $state(false);
</script>

<header class={cn(workspacePageToolbarRowClass, "z-[55] w-full justify-between gap-2")}>
  <SimulatorScenarioDropdown
    {scenarios}
    {onRestoreScenario}
    {onDeleteScenario}
    {onRenameScenario}
    onOpenSave={() => (saveOpen = true)}
  />

  <div class="flex items-center gap-2">
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
