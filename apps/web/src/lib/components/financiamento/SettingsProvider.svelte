<script lang="ts">
  import type { Snippet } from "svelte";
  import {
    createSettingsState,
    setSettingsContext
  } from "$lib/financiamento/settings-context.svelte";

  let { children }: { children?: Snippet } = $props();

  setSettingsContext(createSettingsState());
</script>

{@render children?.()}
