<script lang="ts">
  import { page } from "$app/state";
  import { formatApiError } from "$lib/api/error-message";
  import { logoutToHome } from "$lib/auth/logout";
  import { signInWithGoogle } from "$lib/auth-client";
  import GoogleIcon from "$lib/components/GoogleIcon.svelte";
  import AccountMenu from "$lib/components/layout/AccountMenu.svelte";
  import MarketingHeader from "$lib/components/layout/MarketingHeader.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import { safeRedirectPath } from "$lib/navigation/safe-redirect";
  import type { LayoutData } from "../$types";

  let { children, data } = $props<{
    children?: import("svelte").Snippet;
    data: LayoutData;
  }>();

  let accountOpen = $state(false);
  let googleLoading = $state(false);
  let googleError = $state("");

  const user = $derived(data.user);
  const googleCallbackURL = $derived(
    safeRedirectPath(page.url.searchParams.get("redirect"))
  );
  const logoHref = $derived(user ? "/lista" : "/");
  const showMarketingHeader = $derived(page.url.pathname !== "/intelligence-demo");

  const initials = $derived.by(() => {
    const source: string = user?.name || user?.email || "U";
    return source
      .split(/[ @._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0])
      .join("")
      .toUpperCase();
  });

  function closeChrome() {
    accountOpen = false;
  }

  async function logout() {
    accountOpen = false;
    await logoutToHome();
  }

  async function google() {
    googleLoading = true;
    googleError = "";

    try {
      const result = await signInWithGoogle(googleCallbackURL);
      if (!result.error) return;

      googleError = formatApiError(result.error.message, { action: "entrar com Google" });
      googleLoading = false;
    } catch (err) {
      googleError = formatApiError(err, { action: "entrar com Google" });
      googleLoading = false;
    }
  }
</script>

{#if showMarketingHeader}
  <MarketingHeader href={logoHref}>
    {#snippet actions()}
      {#if user}
        <div class="w-auto max-w-[min(100%,14rem)]">
          <AccountMenu
            {user}
            {initials}
            bind:accountOpen
            compact
            onCloseChrome={closeChrome}
            onLogout={logout}
          />
        </div>
      {:else}
        <div class="relative flex items-center gap-3">
          <a
            href="/login"
            class="inline-flex h-8 items-center rounded-md bg-app-action px-3 text-sm font-medium text-app-action-foreground transition-colors hover:bg-app-action-hover"
          >
            Entrar
          </a>
          <Button
            class="text-sm"
            variant="secondary"
            size="sm"
            onclick={google}
            disabled={googleLoading}
          >
            <GoogleIcon class="size-4" />
            <span aria-live="polite">{googleLoading ? "Conectando..." : "Entrar com Google"}</span>
          </Button>

          {#if googleError}
            <p
              class="absolute top-full right-0 z-10 mt-2 w-max max-w-[min(20rem,calc(100vw-1.5rem))] rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 shadow-sm"
              role="alert"
            >{googleError}</p>
          {/if}
        </div>
      {/if}
    {/snippet}
  </MarketingHeader>
{/if}

{@render children?.()}
