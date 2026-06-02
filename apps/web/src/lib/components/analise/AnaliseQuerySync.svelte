<script lang="ts">
  import { page } from "$app/state";
  import { getCollectionsContext } from "$lib/collections-context.svelte";

  const ctx = getCollectionsContext();

  const collectionId = $derived(page.url.searchParams.get("collection"));

  $effect(() => {
    if (!collectionId || ctx.collections.length === 0) return;
    const match = ctx.collections.find((collection) => collection.id === collectionId);
    if (match) ctx.setActiveCollection(match);
  });
</script>
