<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { api } from "$lib/api/client";

  let error = $state("");

  onMount(() => {
    void resolve();
  });

  async function resolve() {
    try {
      const shortId = page.params.shortId;
      if (!shortId) throw new Error("Link nao encontrado");
      const data = await api.get<{ redirectTo: string }>(`/short-links/${encodeURIComponent(shortId)}`, { auth: false });
      window.location.href = data.redirectTo;
    } catch (err) {
      error = err instanceof Error ? err.message : "Link nao encontrado";
    }
  }
</script>

<svelte:head><title>Link curto | Minha Casa</title></svelte:head>

<main class="flex min-h-screen items-center justify-center bg-app-bg px-4 text-app-fg">
  <section class="max-w-md rounded-md border border-app-border bg-app-surface p-6 text-center">
    {#if error}
      <h1 class="text-xl font-semibold">Link nao encontrado</h1>
      <p class="mt-2 text-sm text-app-muted">{error}</p>
      <a class="mt-4 inline-flex rounded-md bg-app-fg px-4 py-2 text-sm font-medium text-white" href="/anuncios">Abrir anuncios</a>
    {:else}
      <p class="text-sm text-app-muted">Abrindo link...</p>
    {/if}
  </section>
</main>
