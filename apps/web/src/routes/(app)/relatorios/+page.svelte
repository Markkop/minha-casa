<script lang="ts">
  import { onMount } from "svelte";
  import {
    ADMIN_FEATURE_FLAGS_CHANGE_EVENT,
    getAdminFeatureFlag,
    readAdminFeatureFlags
  } from "$lib/admin/feature-flags";
  import PageScaffold from "$lib/components/layout/PageScaffold.svelte";
  import FirstProposalClient from "$lib/components/reports/FirstProposalClient.svelte";

  let { data } = $props<{ data: { user?: { isAdmin?: boolean | null } | null } }>();

  const isAdmin = $derived(Boolean(data.user?.isAdmin));
  let storedFlagsSyncTick = $state(0);
  const showReports = $derived.by(() => {
    void storedFlagsSyncTick;
    return getAdminFeatureFlag(readAdminFeatureFlags(isAdmin), "relatorios", isAdmin);
  });

  onMount(() => {
    const syncFlags = () => {
      storedFlagsSyncTick += 1;
    };
    window.addEventListener("storage", syncFlags);
    window.addEventListener(ADMIN_FEATURE_FLAGS_CHANGE_EVENT, syncFlags);
    return () => {
      window.removeEventListener("storage", syncFlags);
      window.removeEventListener(ADMIN_FEATURE_FLAGS_CHANGE_EVENT, syncFlags);
    };
  });
</script>

<svelte:head>
  <title>Relatórios | Minha Casa</title>
  <meta
    name="description"
    content="Crie uma primeira proposta objetiva a partir dos imóveis da sua coleção."
  />
</svelte:head>

{#if showReports}
  <FirstProposalClient />
{:else}
  <PageScaffold title="Relatórios" description="Criador de cartas e relatórios comparativos.">
    <p class="text-sm text-app-muted">Relatórios indisponíveis.</p>
  </PageScaffold>
{/if}
