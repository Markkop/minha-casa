<script lang="ts">
  import { page } from "$app/state";
  import ListingImagesPrintClient from "$lib/components/property-details/ListingImagesPrintClient.svelte";
</script>

<svelte:head>
  <title>Imprimir imagens | Prisma</title>
</svelte:head>

<ListingImagesPrintClient listingId={page.params.id ?? ""} />
