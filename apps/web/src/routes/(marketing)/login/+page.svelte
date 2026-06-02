<script lang="ts">
  import { goto, invalidate } from "$app/navigation";
  import { page } from "$app/state";
  import { AUTH_INVALIDATION_KEY } from "$lib/auth/logout";
  import { signIn } from "$lib/auth-client";
  import Button from "$lib/components/ui/Button.svelte";
  import { safeRedirectPath } from "$lib/navigation/safe-redirect";
  import { syncSubscriptionCookie } from "$lib/sync-subscription-cookie";

  let email = $state("");
  let password = $state("");
  let error = $state("");
  let loading = $state(false);
  let googleLoading = $state(false);

  const redirectPath = $derived(safeRedirectPath(page.url.searchParams.get("redirect")));

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    loading = true;
    error = "";

    try {
      const result = await signIn.email({ email, password });

      if (result.error) {
        error = result.error.message || "Erro ao fazer login. Verifique suas credenciais.";
        return;
      }

      await syncSubscriptionCookie();
      await invalidate(AUTH_INVALIDATION_KEY);
      await goto(redirectPath);
    } catch {
      error = "Erro ao fazer login. Tente novamente.";
    } finally {
      loading = false;
    }
  }

  async function google() {
    googleLoading = true;
    error = "";
    const result = await signIn.social({
      provider: "google",
      callbackURL: redirectPath
    });
    if (result.error) {
      error = result.error.message || "Erro ao entrar com Google.";
      googleLoading = false;
    }
  }
</script>

<main class="grid min-h-screen place-items-center bg-app-bg px-4">
  <form
    class="w-full max-w-md rounded-md border border-app-border bg-app-surface p-6 shadow-sm"
    onsubmit={handleSubmit}
  >
    <h1 class="text-2xl font-semibold">Entrar</h1>
    <p class="mt-2 text-sm text-app-muted">Acesse sua conta Minha Casa.</p>

    <label class="mt-6 block text-sm font-medium" for="email">Email</label>
    <input
      id="email"
      name="email"
      bind:value={email}
      class="mt-2 h-10 w-full rounded-md border border-app-border bg-white px-3"
      type="email"
      autocomplete="email"
      required
      disabled={loading}
    />

    <label class="mt-4 block text-sm font-medium" for="password">Senha</label>
    <input
      id="password"
      name="password"
      bind:value={password}
      class="mt-2 h-10 w-full rounded-md border border-app-border bg-white px-3"
      type="password"
      autocomplete="current-password"
      required
      disabled={loading}
    />

    {#if error}
      <p class="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
    {/if}

    <Button class="mt-6 w-full" type="submit" disabled={loading || googleLoading}>
      {loading ? "Entrando..." : "Entrar"}
    </Button>
    <Button class="mt-3 w-full" variant="secondary" type="button" onclick={google} disabled={loading || googleLoading}>
      {googleLoading ? "Conectando..." : "Entrar com Google"}
    </Button>
    <p class="mt-5 text-center text-sm text-app-muted">
      Ainda nao tem conta?
      <a class="font-medium text-app-fg" href="/signup">Criar conta</a>
    </p>
  </form>
</main>
