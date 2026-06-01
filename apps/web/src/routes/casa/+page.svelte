<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";

  onMount(() => {
    const search = page.url.search;
    void goto(search ? `/financiamento${search}` : "/financiamento", { replaceState: true });
  });
</script>

<svelte:head><title>Casa | Minha Casa</title></svelte:head>

<main class="flex min-h-screen items-center justify-center bg-app-bg px-4 text-app-fg">
  <div class="rounded-md border border-app-border bg-app-surface p-6 text-sm text-app-muted">Redirecionando para financiamento...</div>
</main>
