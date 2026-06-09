<script lang="ts">
  import SimulatorScenarioDropdown from "$lib/components/financiamento/SimulatorScenarioDropdown.svelte";
  import SimulatorScenarioSavePopover from "$lib/components/financiamento/SimulatorScenarioSavePopover.svelte";
  import type { SimulatorScenarioSnapshot } from "$lib/financiamento/simulator-scenarios-storage";
  import { workspacePageToolbarRowClass } from "$lib/workspace-chrome";
  import { cn } from "$lib/utils";

  let {
    scenarios,
    suggestedScenarioName,
    canCreateScenario = true,
    onRestoreScenario,
    onCreateScenario,
    onDeleteScenario,
    onRenameScenario
  }: {
    scenarios: SimulatorScenarioSnapshot[];
    suggestedScenarioName: string;
    canCreateScenario?: boolean;
    onRestoreScenario: (id: string) => void;
    onCreateScenario: (name: string) => void;
    onDeleteScenario: (id: string) => void;
    onRenameScenario: (id: string, name: string) => void;
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

  <SimulatorScenarioSavePopover
    bind:open={saveOpen}
    suggestedName={suggestedScenarioName}
    canCreate={canCreateScenario}
    onCreate={onCreateScenario}
  />
</header>
