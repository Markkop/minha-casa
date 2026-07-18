<script lang="ts">
  import PageScaffold from "$lib/components/layout/PageScaffold.svelte";
  import ToolsCatalogGrid from "$lib/tools/ToolsCatalogGrid.svelte";
  import { TOOLS_CATALOG } from "$lib/tools/tools-catalog";
</script>

<svelte:head>
  <title>Ferramentas | Minha Casa</title>
</svelte:head>

<PageScaffold
  title="Ferramentas"
  description="Recursos para apoiar a avaliação dos imóveis da sua lista."
>
  <ToolsCatalogGrid entries={TOOLS_CATALOG} />
</PageScaffold>
