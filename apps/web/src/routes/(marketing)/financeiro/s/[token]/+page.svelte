<script lang="ts">
  import CollectionsProvider from "$lib/components/listings/CollectionsProvider.svelte";
  import FinanceiroSharedImportPopover from "$lib/components/financiamento/FinanceiroSharedImportPopover.svelte";
  import SettingsProvider from "$lib/components/financiamento/SettingsProvider.svelte";
  import SimulatorClient from "$lib/components/financiamento/SimulatorClient.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const snapshot = $derived(data.snapshot);
  const canImport = $derived(data.canImport);
</script>

<svelte:head>
  <title>{snapshot.title} | Financeiro compartilhado</title>
  <meta
    name="description"
    content="Visualização financeira compartilhada com parâmetros e gráficos estáticos."
  />
</svelte:head>

<CollectionsProvider enabled={canImport}>
  <SettingsProvider initialSettings={snapshot.payload.settings} persist={false}>
    <SimulatorClient
      initialParams={snapshot.payload.params}
      initialComparisonGroup={snapshot.payload.comparisonGroup}
      workspaceMode={false}
      persistParams={false}
      title={snapshot.title}
    >
      {#snippet sharedHeaderActions()}
        {#if canImport}
          <FinanceiroSharedImportPopover token={snapshot.token} suggestedName={snapshot.title} />
        {/if}
      {/snippet}
    </SimulatorClient>
  </SettingsProvider>
</CollectionsProvider>
