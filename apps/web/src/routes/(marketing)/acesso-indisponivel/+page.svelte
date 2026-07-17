<script lang="ts">
  import { page } from "$app/state";
  import { logoutToHome } from "$lib/auth/logout";
  import Button from "$lib/components/ui/Button.svelte";
  import { safeRedirectPath } from "$lib/navigation/safe-redirect";

  const retryPath = $derived(
    safeRedirectPath(page.url.searchParams.get("redirect"), "/anuncios")
  );

  function retry() {
    window.location.assign(retryPath);
  }
</script>

<svelte:head>
  <title>Acesso temporariamente indisponível | Minha Casa</title>
</svelte:head>

<main class="grid min-h-screen place-items-center bg-app-bg px-4">
  <section class="w-full max-w-lg rounded-md border border-app-border bg-app-surface p-6 text-center shadow-sm">
    <h1 class="text-2xl font-semibold">Não foi possível validar sua assinatura</h1>
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
