<script lang="ts">
  import { X } from "@lucide/svelte";
  import type { WorkspaceRightSidebarContextValue } from "$lib/workspace-right-sidebar.svelte";
  import { workspaceChromeRowClass } from "$lib/workspace-chrome";
  import { cn } from "$lib/utils";

  let { sidebar }: { sidebar: WorkspaceRightSidebarContextValue } = $props();
  let contentTarget = $state<HTMLDivElement | null>(null);

  $effect(() => {
    sidebar.setContentTarget(contentTarget);
    return () => sidebar.setContentTarget(null);
  });
</script>

{#if sidebar.registration}
  <aside
    data-slot="right-sidebar"
    class={cn(
      "fixed inset-y-0 right-0 z-[80] w-[min(92vw,var(--right-sidebar-width))] flex-col border-l border-app-border bg-app-surface text-app-fg shadow-xl lg:z-50 lg:w-[var(--right-sidebar-width)] lg:shadow-none",
      sidebar.mobileOpen ? "flex lg:hidden" : "hidden",
      sidebar.desktopOpen && "lg:flex"
    )}
  >
    <div class={cn(workspaceChromeRowClass, "justify-between gap-2")}>
      <h2 class="truncate text-sm font-semibold">{sidebar.registration.title}</h2>
      <button
        type="button"
        class="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-app-muted transition hover:bg-app-surface-muted hover:text-app-fg"
        aria-label="Fechar painel de parâmetros"
        onclick={sidebar.close}
      >
        <X class="size-4" />
      </button>
    </div>
    <div bind:this={contentTarget} class="min-h-0 flex-1 overflow-y-auto"></div>
  </aside>

  {#if sidebar.mobileOpen}
    <button
      type="button"
      class="fixed inset-0 z-[70] bg-black/35 lg:hidden"
      aria-label="Fechar painel de parâmetros"
      onclick={sidebar.close}
    ></button>
  {/if}
{/if}
