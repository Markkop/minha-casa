<script lang="ts">
  import { formatApiError } from "$lib/api/error-message";
  import PageScaffold from "$lib/components/layout/PageScaffold.svelte";
  import { workspaceApi } from "$lib/workspace/client";
  import { onMount } from "svelte";

  let counts = $state({ links: 0, contacts: 0, regions: 0, condominiums: 0 });
  let loading = $state(true);
  let error = $state("");

  onMount(async () => {
    try {
      const [links, contacts, regions, condominiums] = await Promise.all([
        workspaceApi.fetchSavedLinks(),
        workspaceApi.fetchContacts(),
        workspaceApi.fetchRegions(),
        workspaceApi.fetchCondominiums()
      ]);
      counts = {
        links: links.links.length,
        contacts: contacts.contacts.length,
        regions: regions.regions.length,
        condominiums: condominiums.condominiums.length
      };
    } catch (err) {
      error = formatApiError(err, { action: "carregar visão geral" });
    } finally {
      loading = false;
    }
  });
</script>

<PageScaffold title="Visao geral" description="Resumo operacional do workspace.">
  {#if error}
    <div class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
  {/if}
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {#each [
      { label: "Links", value: counts.links, href: "/links" },
      { label: "Contatos", value: counts.contacts, href: "/contatos" },
      { label: "Regioes", value: counts.regions, href: "/regioes" },
      { label: "Condominios", value: counts.condominiums, href: "/condominios" }
    ] as item}
      <a class="rounded-md border border-app-border bg-app-surface p-4 hover:bg-muted" href={item.href}>
        <div class="text-sm text-app-muted">{item.label}</div>
        <div class="mt-2 text-2xl font-semibold">{loading ? "--" : item.value}</div>
      </a>
    {/each}
  </div>

  <div class="grid gap-3 md:grid-cols-2">
    {#each [
      { title: "Importar ou revisar imóveis", description: "Use a coleção ativa para revisar e adicionar imóveis.", href: "/lista" },
      { title: "Comparar favoritos", description: "Monte a comparação com os imóveis da coleção ativa.", href: "/comparacao" },
      { title: "Completar referencias de regiao", description: `${counts.regions} regiao(oes) cadastrada(s).`, href: "/regioes" },
      { title: "Organizar contatos e links", description: `${counts.contacts} contato(s), ${counts.links} link(s) e ${counts.condominiums} condominio(s).`, href: "/contatos" }
    ] as step}
      <a class="rounded-md border border-app-border bg-app-surface p-4 hover:bg-muted" href={step.href}>
        <h2 class="font-medium">{step.title}</h2>
        <p class="mt-1 text-sm text-app-muted">{step.description}</p>
      </a>
    {/each}
  </div>
</PageScaffold>
