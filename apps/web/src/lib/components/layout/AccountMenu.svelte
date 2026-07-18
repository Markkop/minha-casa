<script lang="ts">
  import type { Snippet } from "svelte";
  import { Flag, LogOut, Settings, Waves, ClipboardList } from "@lucide/svelte";
  import AnchoredPopover from "$lib/components/ui/AnchoredPopover.svelte";
  import { isPlatformSuperAdmin } from "$lib/admin/platform-role";

  type ShellUser = {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    isAdmin?: boolean | null;
    isSuperAdmin?: boolean | null;
    superAdmin?: boolean | null;
  };

  let {
    user,
    initials,
    hasFloodRisk,
    accountMenuItems,
    accountOpen = $bindable(false),
    onCloseChrome,
    onLogout,
    compact = false
  }: {
    user?: ShellUser | null;
    initials: string;
    hasFloodRisk: boolean;
    accountMenuItems?: Snippet;
    accountOpen?: boolean;
    compact?: boolean;
    onCloseChrome: () => void;
    onLogout: () => void | Promise<void>;
  } = $props();
</script>

<AnchoredPopover
  bind:open={accountOpen}
  align="auto"
  offset={4}
  rootClass={compact ? "relative w-auto" : "relative w-full"}
  panelClass="w-64 overflow-hidden py-1 text-sm"
>
  {#snippet trigger()}
    <button
      type="button"
      data-account-menu
      class={compact
        ? "inline-flex h-8 min-h-0 w-auto max-w-[min(100%,14rem)] items-center gap-2 rounded-md border border-app-border bg-app-surface px-2 py-0 text-left text-sm text-app-fg transition-colors hover:bg-app-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
        : "flex min-h-10 w-full min-w-0 items-center gap-2 rounded-md px-2 text-left text-sm text-app-fg transition-colors hover:bg-app-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"}
      aria-label="Menu do usuario"
      aria-haspopup="menu"
      aria-expanded={accountOpen}
      onclick={(event) => {
        event.stopPropagation();
        accountOpen = !accountOpen;
      }}
    >
      {#if user?.image}
        <img src={user.image} alt="" class="h-8 w-8 shrink-0 rounded-full border border-app-border object-cover" />
      {:else}
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-app-border bg-app-surface-muted text-xs font-semibold">
          {initials}
        </span>
      {/if}
      <span class="min-w-0 flex-1">
        <span class="block truncate font-medium">{user?.name || user?.email || "Usuário"}</span>
        {#if user?.email && !compact}
          <span class="block truncate text-xs text-app-muted">{user.email}</span>
        {/if}
      </span>
    </button>
  {/snippet}
  <div role="menu">
    <div class="border-b border-app-border px-3 py-2">
      <div class="truncate font-medium">{user?.name || "Usuário"}</div>
      <div class="truncate text-xs text-app-muted">{user?.email}</div>
    </div>
    {#if hasFloodRisk}
      <a href="/floodrisk" role="menuitem" class="flex items-center gap-2 px-3 py-2 hover:bg-app-surface-muted" onclick={onCloseChrome}>
        <Waves class="h-4 w-4" />
        <span>Risco enchente</span>
      </a>
    {/if}
    {#if isPlatformSuperAdmin(user)}
      <a href="/admin/feature-flags" role="menuitem" class="flex items-center gap-2 px-3 py-2 hover:bg-app-surface-muted" onclick={onCloseChrome}>
        <Flag class="h-4 w-4" />
        <span>Feature flags</span>
      </a>
      <a href="/admin" role="menuitem" class="flex items-center gap-2 px-3 py-2 hover:bg-app-surface-muted" onclick={onCloseChrome}>
        <Settings class="h-4 w-4" />
        <span>Super Admin</span>
      </a>
    {/if}
    <a href="/subscribe" role="menuitem" class="flex items-center gap-2 px-3 py-2 hover:bg-app-surface-muted" onclick={onCloseChrome}>
      <ClipboardList class="h-4 w-4" />
      <span>Assinatura</span>
    </a>
    {#if accountMenuItems}
      <div class="my-1 border-t border-app-border"></div>
      {@render accountMenuItems()}
    {/if}
    <div class="my-1 border-t border-app-border"></div>
    <button type="button" role="menuitem" class="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-app-surface-muted" onclick={onLogout}>
      <LogOut class="h-4 w-4" />
      <span>Sair</span>
    </button>
  </div>
</AnchoredPopover>
