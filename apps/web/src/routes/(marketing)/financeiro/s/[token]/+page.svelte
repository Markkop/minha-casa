<script lang="ts">
  import CollectionsProvider from "$lib/components/anuncios/CollectionsProvider.svelte";
  import SettingsProvider from "$lib/components/financiamento/SettingsProvider.svelte";
  import SimulatorClient from "$lib/components/financiamento/SimulatorClient.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const snapshot = $derived(data.snapshot);
</script>

<svelte:head>
  <title>{snapshot.title} | Financeiro compartilhado</title>
  <meta
    name="description"
    content="Visualização financeira compartilhada com parâmetros e gráficos estáticos."
  />
</svelte:head>

<CollectionsProvider enabled={false}>
  <SettingsProvider initialSettings={snapshot.payload.settings} persist={false}>
    <SimulatorClient
      initialParams={snapshot.payload.params}
      workspaceMode={false}
      persistParams={false}
      title={snapshot.title}
    />
  </SettingsProvider>
</CollectionsProvider>
