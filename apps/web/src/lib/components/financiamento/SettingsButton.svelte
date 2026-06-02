<script lang="ts">
  import { Settings } from "@lucide/svelte";
  import PageToolbarIconButton from "$lib/components/page-toolbar/PageToolbarIconButton.svelte";

  let { onclick }: { onclick: () => void } = $props();
</script>

<PageToolbarIconButton {onclick} title="Configurações">
  <Settings class="text-app-muted" />
</PageToolbarIconButton>
