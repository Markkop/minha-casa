<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { api } from "$lib/api/client";

  const LINK_UNAVAILABLE_MESSAGE =
    "Este link não está mais disponível. Pode ter expirado ou sido removido.";

  let error = $state("");

  onMount(() => {
    void resolve();
  });

  async function resolve() {
    try {
      const shortId = page.params.shortId;
      if (!shortId) throw new Error(LINK_UNAVAILABLE_MESSAGE);
      const data = await api.get<{ redirectTo: string }>(`/short-links/${encodeURIComponent(shortId)}`, { auth: false });
      window.location.href = data.redirectTo;
    } catch {
      error = LINK_UNAVAILABLE_MESSAGE;
    }
  }
</script>

<svelte:head><title>Link curto | Prisma</title></svelte:head>

<main class="app-page-background flex min-h-screen items-center justify-center px-4 text-app-fg">
  <section class="app-panel-surface max-w-md rounded-lg border border-app-border p-6 text-center">
    {#if error}
      <h1 class="text-xl font-semibold">Link indisponível</h1>
      <p class="mt-2 text-sm text-app-muted">{error}</p>
      <a class="mt-4 inline-flex rounded-md bg-app-action px-4 py-2 text-sm font-medium text-app-action-foreground hover:bg-app-action-hover" href="/lista">Abrir lista</a>
    {:else}
      <p class="text-sm text-app-muted">Abrindo link...</p>
    {/if}
  </section>
</main>
