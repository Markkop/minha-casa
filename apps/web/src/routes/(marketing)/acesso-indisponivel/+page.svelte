<script lang="ts">
  import { page } from "$app/state";
  import { logoutToHome } from "$lib/auth/logout";
  import Button from "$lib/components/ui/Button.svelte";
  import { safeRedirectPath } from "$lib/navigation/safe-redirect";

  const retryPath = $derived(
    safeRedirectPath(page.url.searchParams.get("redirect"), "/lista")
  );

  function retry() {
    window.location.assign(retryPath);
  }
</script>

<svelte:head>
  <title>Acesso temporariamente indisponível | Prisma</title>
</svelte:head>

<main class="app-page-background grid min-h-screen place-items-center px-4">
  <section class="app-panel-surface w-full max-w-lg rounded-lg border border-app-border p-6 text-center">
    <h1 class="app-page-title text-2xl font-semibold">Não foi possível validar sua assinatura</h1>
    <p class="mt-3 text-sm text-app-muted">
      O serviço está temporariamente indisponível. Seu plano não foi marcado como inativo.
      Tente novamente em alguns instantes.
    </p>
    <div class="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
      <Button onclick={retry}>Tentar novamente</Button>
      <Button variant="secondary" onclick={() => void logoutToHome()}>Sair</Button>
    </div>
  </section>
</main>
