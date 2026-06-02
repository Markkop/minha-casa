<script lang="ts">
  import SimulatorClient from "$lib/components/financiamento/SimulatorClient.svelte";
  import SettingsProvider from "$lib/components/financiamento/SettingsProvider.svelte";
</script>

<svelte:head>
  <title>Financiamento | Minha Casa</title>
  <meta
    name="description"
    content="Simulador de financiamento imobiliário com cenários, amortização e análise de compra."
  />
</svelte:head>

<SettingsProvider>
  <SimulatorClient />
</SettingsProvider>
