<script lang="ts">
  import SimulatorPresetDropdown from "$lib/components/financiamento/SimulatorPresetDropdown.svelte";
  import SimulatorPresetSavePopover from "$lib/components/financiamento/SimulatorPresetSavePopover.svelte";
  import type { SimulatorPreset } from "$lib/financiamento/simulator-presets-storage";
  import { workspacePageToolbarRowClass } from "$lib/workspace-chrome";
  import { cn } from "$lib/utils";

  let {
    presets,
    activePresetId,
    presetDirty = false,
    suggestedPresetName,
    canCreatePreset = true,
    onSelectPreset,
    onSavePreset,
    onDeletePreset,
    onRenamePreset
  }: {
    presets: SimulatorPreset[];
    activePresetId: string | null;
    presetDirty?: boolean;
    suggestedPresetName: string;
    canCreatePreset?: boolean;
    onSelectPreset: (id: string) => void;
    onSavePreset: (input: { name: string; mode: "create" | "update" }) => void;
    onDeletePreset: (id: string) => void;
    onRenamePreset: (id: string, name: string) => void;
  } = $props();

  let saveOpen = $state(false);

  const activePreset = $derived(presets.find((preset) => preset.id === activePresetId) ?? null);
</script>

<header
  class={cn(
    workspacePageToolbarRowClass,
    "sticky top-[var(--nav-height,2.75rem)] z-[55] w-full justify-between gap-2"
  )}
>
  <SimulatorPresetDropdown
    {presets}
    {activePresetId}
    dirty={presetDirty}
    {onSelectPreset}
    {onDeletePreset}
    {onRenamePreset}
    onOpenSave={() => (saveOpen = true)}
  />

  <SimulatorPresetSavePopover
    bind:open={saveOpen}
    activePresetName={activePreset?.name ?? null}
    suggestedName={suggestedPresetName}
    canCreate={canCreatePreset}
    onSave={onSavePreset}
  />
</header>
