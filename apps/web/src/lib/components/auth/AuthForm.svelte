<script lang="ts">
  import { afterNavigate } from "$app/navigation";
  import { page } from "$app/state";
  import { resolveAuthMode, type AuthMode } from "$lib/auth/auth-mode";
  import { signIn, signInWithGoogle, signUp } from "$lib/auth-client";
  import GoogleIcon from "$lib/components/GoogleIcon.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import { authRouteWithRedirect, safeRedirectPath } from "$lib/navigation/safe-redirect";
  import { tick } from "svelte";

  let name = $state("");
  let email = $state("");
  let password = $state("");
  let error = $state("");
  let loading = $state(false);
  let googleLoading = $state(false);

  let nameInput: HTMLInputElement | undefined;
  let emailInput: HTMLInputElement | undefined;
  let observedMode: AuthMode = resolveAuthMode(page.url.pathname);
  let pendingFocus: AuthMode | null = null;
  let operationVersion = 0;

  const mode = $derived(resolveAuthMode(page.url.pathname));
  const isSignup = $derived(mode === "signup");
  const busy = $derived(loading || googleLoading);
  const redirectPath = $derived(safeRedirectPath(page.url.searchParams.get("redirect")));
  const loginHref = $derived(authRouteWithRedirect("/login", redirectPath));
  const signupHref = $derived(authRouteWithRedirect("/signup", redirectPath));

  afterNavigate(() => {
    const focusTarget = pendingFocus;
    pendingFocus = null;
    if (!focusTarget || focusTarget !== mode) return;

    void tick().then(() => {
      (focusTarget === "signup" ? nameInput : emailInput)?.focus();
    });
  });

  $effect(() => {
    const currentMode = mode;
    if (currentMode === observedMode) return;

    observedMode = currentMode;
    operationVersion += 1;
    loading = false;
    googleLoading = false;
    error = "";
  });

  function prepareModeSwitch(event: MouseEvent, targetMode: AuthMode) {
    if (busy) {
      event.preventDefault();
      return;
    }

    error = "";
    pendingFocus = targetMode;
  }

  function isCurrentOperation(version: number, submittedMode: AuthMode) {
    return version === operationVersion && mode === submittedMode;
  }

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    const submittedMode = mode;
    const version = ++operationVersion;
    loading = true;
    error = "";

    try {
      const result = submittedMode === "signup"
        ? await signUp.email({ name, email, password })
        : await signIn.email({ email, password });

      if (!isCurrentOperation(version, submittedMode)) return;

      if (result.error) {
        error = result.error.message || (submittedMode === "signup"
          ? "Não foi possível criar sua conta."
          : "Erro ao fazer login. Verifique suas credenciais.");
        return;
      }

      window.location.assign(redirectPath);
    } catch {
      if (!isCurrentOperation(version, submittedMode)) return;
      error = submittedMode === "signup"
        ? "Erro ao criar conta. Tente novamente."
        : "Erro ao fazer login. Tente novamente.";
    } finally {
      if (isCurrentOperation(version, submittedMode)) loading = false;
    }
  }

  async function google() {
    const submittedMode = mode;
    const version = ++operationVersion;
    googleLoading = true;
    error = "";

    try {
      const result = await signInWithGoogle(redirectPath);

      if (!isCurrentOperation(version, submittedMode) || !result.error) return;

      error = result.error.message || (submittedMode === "signup"
        ? "Erro ao continuar com Google."
        : "Erro ao entrar com Google.");
      googleLoading = false;
    } catch {
      if (!isCurrentOperation(version, submittedMode)) return;
      error = submittedMode === "signup"
        ? "Erro ao continuar com Google."
        : "Erro ao entrar com Google.";
      googleLoading = false;
    }
  }
</script>

<main class="grid min-h-screen place-items-center bg-app-bg px-4">
  <form
    class="w-full max-w-md rounded-md border border-app-border bg-app-surface p-6 shadow-sm"
    aria-busy={busy}
    onsubmit={handleSubmit}
  >
    <div class="auth-copy-grid">
      <div class:auth-copy-active={!isSignup} class="auth-copy" aria-hidden={isSignup}>
        <h1 class="text-2xl font-semibold">Entrar</h1>
        <p class="mt-2 text-sm text-app-muted">Acesse sua conta Minha Casa.</p>
      </div>
      <div class:auth-copy-active={isSignup} class="auth-copy" aria-hidden={!isSignup}>
        <h1 class="text-2xl font-semibold">Criar conta</h1>
        <p class="mt-2 text-sm text-app-muted">Comece a organizar seus imóveis.</p>
      </div>
    </div>

    <div
      class:auth-name-open={isSignup}
      class="auth-name-grid"
      aria-hidden={!isSignup}
      inert={!isSignup}
    >
      <div class="min-h-0 overflow-hidden">
        <label class="block pt-6 text-sm font-medium" for="auth-name">Nome</label>
        <input
          id="auth-name"
          name="name"
          bind:this={nameInput}
          bind:value={name}
          class="mt-2 h-10 w-full rounded-md border border-app-border bg-white px-3"
          autocomplete="name"
          required={isSignup}
          disabled={!isSignup || busy}
        />
      </div>
    </div>

    <label
      class="block text-sm font-medium transition-[margin] duration-200 motion-reduce:transition-none"
      class:mt-4={isSignup}
      class:mt-6={!isSignup}
      for="auth-email"
    >Email</label>
    <input
      id="auth-email"
      name="email"
      bind:this={emailInput}
      bind:value={email}
      class="mt-2 h-10 w-full rounded-md border border-app-border bg-white px-3"
      type="email"
      autocomplete="email"
      required
      disabled={busy}
    />

    <label class="mt-4 block text-sm font-medium" for="auth-password">Senha</label>
    <input
      id="auth-password"
      name="password"
      bind:value={password}
      class="mt-2 h-10 w-full rounded-md border border-app-border bg-white px-3"
      type="password"
      autocomplete={isSignup ? "new-password" : "current-password"}
      required
      disabled={busy}
    />

    {#if error}
      <p
        class="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        role="alert"
      >{error}</p>
    {/if}

    <Button class="mt-6 w-full" type="submit" disabled={busy}>
      <span class="auth-label-grid">
        <span class:auth-label-active={!isSignup} class="auth-label" aria-hidden={isSignup}>
          {loading ? "Entrando..." : "Entrar"}
        </span>
        <span class:auth-label-active={isSignup} class="auth-label" aria-hidden={!isSignup}>
          {loading ? "Criando..." : "Criar conta"}
        </span>
      </span>
    </Button>
    <Button class="mt-3 w-full" variant="secondary" type="button" onclick={google} disabled={busy}>
      <GoogleIcon class="size-4" />
      <span class="auth-label-grid">
        <span class:auth-label-active={!isSignup} class="auth-label" aria-hidden={isSignup}>
          {googleLoading ? "Conectando..." : "Entrar com Google"}
        </span>
        <span class:auth-label-active={isSignup} class="auth-label" aria-hidden={!isSignup}>
          {googleLoading ? "Conectando..." : "Continuar com Google"}
        </span>
      </span>
    </Button>

    <div class="auth-switch-grid mt-5 text-center text-sm text-app-muted">
      <p class:auth-copy-active={!isSignup} class="auth-copy" aria-hidden={isSignup}>
        Ainda não tem conta?
        <a
          class="font-medium text-app-fg"
          class:auth-link-disabled={busy}
          href={signupHref}
          aria-disabled={busy}
          tabindex={isSignup ? -1 : undefined}
          onclick={(event) => prepareModeSwitch(event, "signup")}
        >Criar conta</a>
      </p>
      <p class:auth-copy-active={isSignup} class="auth-copy" aria-hidden={!isSignup}>
        Já tem conta?
        <a
          class="font-medium text-app-fg"
          class:auth-link-disabled={busy}
          href={loginHref}
          aria-disabled={busy}
          tabindex={!isSignup ? -1 : undefined}
          onclick={(event) => prepareModeSwitch(event, "login")}
        >Entrar</a>
      </p>
    </div>
  </form>
</main>

<style>
  .auth-copy-grid,
  .auth-switch-grid,
  .auth-label-grid {
    display: grid;
  }

  .auth-copy,
  .auth-label {
    grid-area: 1 / 1;
    opacity: 0;
    pointer-events: none;
    transform: translateY(0.2rem);
    transition:
      opacity 160ms ease,
      transform 200ms ease;
  }

  .auth-copy-active,
  .auth-label-active {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
  }

  .auth-name-grid {
    display: grid;
    grid-template-rows: 0fr;
    opacity: 0;
    transform: translateY(-0.25rem);
    transition:
      grid-template-rows 200ms ease,
      opacity 160ms ease,
      transform 200ms ease;
  }

  .auth-name-open {
    grid-template-rows: 1fr;
    opacity: 1;
    transform: translateY(0);
  }

  .auth-link-disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  @media (prefers-reduced-motion: reduce) {
    .auth-copy,
    .auth-label,
    .auth-name-grid {
      transition: none;
    }
  }
</style>
