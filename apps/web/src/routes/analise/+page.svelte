<script lang="ts">
  import AnaliseClient from "$lib/components/analise/AnaliseClient.svelte";
  import type { PageData } from "./$types";

  let { data } = $props<{ data: PageData }>();
</script>

<svelte:head>
  <title>Análise | Minha Casa</title>
</svelte:head>

<AnaliseClient isAdmin={Boolean(data.user?.isAdmin)} />
