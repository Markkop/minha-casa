<script lang="ts">
  import SimulatorClient from "$lib/components/financiamento/SimulatorClient.svelte";
  import SettingsProvider from "$lib/components/financiamento/SettingsProvider.svelte";
</script>

<svelte:head>
  <title>Financeiro | Minha Casa</title>
  <meta
    name="description"
    content="Planeje a compra do imóvel com cenários de financiamento, amortização e fluxo financeiro."
  />
</svelte:head>

<SettingsProvider>
  <SimulatorClient />
</SettingsProvider>
