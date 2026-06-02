<script lang="ts">
  import { logoutToHome } from "$lib/auth/logout";
  import AccountMenu from "$lib/components/layout/AccountMenu.svelte";
  import MarketingHeader from "$lib/components/layout/MarketingHeader.svelte";
  import type { LayoutData } from "../$types";

  let { children, data } = $props<{
    children?: import("svelte").Snippet;
    data: LayoutData;
  }>();

  let accountOpen = $state(false);

  const user = $derived(data.user);
  const subscriptionActive = $derived(data.subscriptionActive);
  const logoHref = $derived(
    !user ? "/" : subscriptionActive ? "/anuncios" : "/subscribe"
  );

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
</script>

<MarketingHeader href={logoHref}>
  {#snippet actions()}
    {#if user}
      <div class="w-auto max-w-[min(100%,14rem)]">
        <AccountMenu
          {user}
          {initials}
          hasFloodRisk={false}
          bind:accountOpen
          compact
          onCloseChrome={closeChrome}
          onLogout={logout}
        />
      </div>
    {:else}
      <a
        href="/login"
        class="inline-flex h-8 items-center rounded-md bg-app-action px-3 text-sm font-medium text-app-action-foreground transition-colors hover:bg-app-action-hover"
      >
        Entrar
      </a>
    {/if}
  {/snippet}
</MarketingHeader>

{@render children?.()}
