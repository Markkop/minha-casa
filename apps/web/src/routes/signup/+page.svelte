<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { signIn, signUp } from "$lib/auth-client";
  import Button from "$lib/components/ui/Button.svelte";
  import { syncSubscriptionCookie } from "$lib/sync-subscription-cookie";

  let name = $state("");
  let email = $state("");
  let password = $state("");
  let error = $state("");
  let loading = $state(false);

  async function signup() {
    loading = true;
    error = "";
    const result = await signUp.email({ name, email, password });
    loading = false;
    if (result.error) {
      error = result.error.message ?? "Nao foi possivel criar sua conta.";
      return;
    }
    await syncSubscriptionCookie();
    await goto($page.url.searchParams.get("redirect") || "/anuncios");
  }

  async function google() {
    await signIn.social({
      provider: "google",
      callbackURL: $page.url.searchParams.get("redirect") || "/anuncios"
    });
  }
</script>

<main class="grid min-h-screen place-items-center bg-app-bg px-4">
  <form class="w-full max-w-md rounded-md border border-app-border bg-app-surface p-6 shadow-sm" onsubmit={(event) => { event.preventDefault(); void signup(); }}>
    <h1 class="text-2xl font-semibold">Criar conta</h1>
    <p class="mt-2 text-sm text-app-muted">Comece a organizar seus imoveis.</p>

    <label class="mt-6 block text-sm font-medium" for="name">Nome</label>
    <input id="name" bind:value={name} class="mt-2 h-10 w-full rounded-md border border-app-border bg-white px-3" autocomplete="name" required />

    <label class="mt-4 block text-sm font-medium" for="email">Email</label>
    <input id="email" bind:value={email} class="mt-2 h-10 w-full rounded-md border border-app-border bg-white px-3" type="email" autocomplete="email" required />

    <label class="mt-4 block text-sm font-medium" for="password">Senha</label>
    <input id="password" bind:value={password} class="mt-2 h-10 w-full rounded-md border border-app-border bg-white px-3" type="password" autocomplete="new-password" required />

    {#if error}
      <p class="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
    {/if}

    <Button class="mt-6 w-full" type="submit" disabled={loading}>{loading ? "Criando..." : "Criar conta"}</Button>
    <Button class="mt-3 w-full" variant="secondary" onclick={google}>Criar com Google</Button>
    <p class="mt-5 text-center text-sm text-app-muted">Ja tem conta? <a class="font-medium text-app-fg" href="/login">Entrar</a></p>
  </form>
</main>
