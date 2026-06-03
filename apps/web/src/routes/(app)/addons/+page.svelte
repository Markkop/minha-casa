<script lang="ts">
  import PageScaffold from "$lib/components/layout/PageScaffold.svelte";
  import AddonsCatalogGrid from "$lib/addons/AddonsCatalogGrid.svelte";
  import { ADDONS_CATALOG } from "$lib/addons/addons-catalog";
</script>

<PageScaffold
  title="Addons"
  description="Ferramentas extras para apoiar sua jornada de compra."
>
  <AddonsCatalogGrid entries={ADDONS_CATALOG} />
</PageScaffold>
