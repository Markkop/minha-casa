<script lang="ts">
  import type { Snippet } from "svelte";
  import type { SimulatorSettings } from "$lib/financiamento/settings";
  import {
    createSettingsState,
    setSettingsContext
  } from "$lib/financiamento/settings-context.svelte";

  const {
    children,
    initialSettings,
    persist = true
  }: {
    children?: Snippet;
    initialSettings?: SimulatorSettings;
    persist?: boolean;
  } = $props();

  function createInitialSettingsState() {
    return createSettingsState({ initialSettings, persist });
  }

  setSettingsContext(createInitialSettingsState());
</script>

{@render children?.()}
