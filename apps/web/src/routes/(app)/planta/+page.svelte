<script lang="ts">
  import PlantaClient from "$lib/components/planta/PlantaClient.svelte";
  import WorkspaceListingQuerySync from "$lib/components/workspace/WorkspaceListingQuerySync.svelte";
</script>

<svelte:head>
  <title>Planta | Prisma</title>
</svelte:head>

<WorkspaceListingQuerySync />
<PlantaClient />
