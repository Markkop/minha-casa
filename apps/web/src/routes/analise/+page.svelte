<script lang="ts">
  import AnaliseClient from "$lib/components/analise/AnaliseClient.svelte";

  let { data } = $props<{ data: App.PageData }>();
</script>

<svelte:head>
  <title>Análise | Minha Casa</title>
</svelte:head>

<AnaliseClient isAdmin={Boolean(data.user?.isAdmin)} />
