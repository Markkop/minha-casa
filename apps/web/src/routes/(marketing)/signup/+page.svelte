<script lang="ts">
  import { goto, invalidate } from "$app/navigation";
  import { page } from "$app/state";
  import { AUTH_INVALIDATION_KEY } from "$lib/auth/logout";
  import { signIn, signUp } from "$lib/auth-client";
  import Button from "$lib/components/ui/Button.svelte";
  import { authRouteWithRedirect, safeRedirectPath } from "$lib/navigation/safe-redirect";
  import { syncSubscriptionCookie } from "$lib/sync-subscription-cookie";

  let name = $state("");
  let email = $state("");
  let password = $state("");
  let error = $state("");
  let loading = $state(false);
  let googleLoading = $state(false);

  const redirectPath = $derived(safeRedirectPath(page.url.searchParams.get("redirect")));
  const loginHref = $derived(authRouteWithRedirect("/login", redirectPath));

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    loading = true;
    error = "";

    try {
      const result = await signUp.email({ name, email, password });

      if (result.error) {
        error = result.error.message || "Não foi possível criar sua conta.";
        return;
      }

      await syncSubscriptionCookie();
      await invalidate(AUTH_INVALIDATION_KEY);
      await goto(redirectPath);
    } catch {
      error = "Erro ao criar conta. Tente novamente.";
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
      error = result.error.message || "Erro ao continuar com Google.";
      googleLoading = false;
    }
  }
</script>

<main class="grid min-h-screen place-items-center bg-app-bg px-4">
  <form
    class="w-full max-w-md rounded-md border border-app-border bg-app-surface p-6 shadow-sm"
    onsubmit={handleSubmit}
  >
    <h1 class="text-2xl font-semibold">Criar conta</h1>
    <p class="mt-2 text-sm text-app-muted">Comece a organizar seus imoveis.</p>

    <label class="mt-6 block text-sm font-medium" for="name">Nome</label>
    <input
      id="name"
      name="name"
      bind:value={name}
      class="mt-2 h-10 w-full rounded-md border border-app-border bg-white px-3"
      autocomplete="name"
      required
      disabled={loading}
    />

    <label class="mt-4 block text-sm font-medium" for="email">Email</label>
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
      autocomplete="new-password"
      required
      disabled={loading}
    />

    {#if error}
      <p class="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
    {/if}

    <Button class="mt-6 w-full" type="submit" disabled={loading || googleLoading}>
      {loading ? "Criando..." : "Criar conta"}
    </Button>
    <Button class="mt-3 w-full" variant="secondary" type="button" onclick={google} disabled={loading || googleLoading}>
      {googleLoading ? "Conectando..." : "Continuar com Google"}
    </Button>
    <p class="mt-5 text-center text-sm text-app-muted">
      Ja tem conta?
      <a class="font-medium text-app-fg" href={loginHref}>Entrar</a>
    </p>
  </form>
</main>
