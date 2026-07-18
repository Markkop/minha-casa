<script lang="ts">
  import { page } from "$app/state";
  import PropertyDetailsClient from "$lib/components/property-details/PropertyDetailsClient.svelte";
</script>

<PropertyDetailsClient listingId={page.params.id ?? ""} />
