<script lang="ts">
  import { PanelLeft } from "@lucide/svelte";
  import { cn } from "$lib/utils";
  import { workspaceChromeRowClass, workspaceTopBarControlClass } from "$lib/workspace-chrome";
  import AnaliseListingBreadcrumb from "$lib/components/analise/AnaliseListingBreadcrumb.svelte";
  import CollectionBreadcrumb from "$lib/components/workspace/CollectionBreadcrumb.svelte";
  import OrganizationSwitcher from "$lib/components/workspace/OrganizationSwitcher.svelte";

  let {
    showSubscriptionPendingChrome,
    showAnaliseListingBreadcrumb,
    showOrgBreadcrumb,
    orgBreadcrumbClass,
    collectionBreadcrumbClass,
    onToggleSidebar
  }: {
    showSubscriptionPendingChrome: boolean;
    showAnaliseListingBreadcrumb: boolean;
    showOrgBreadcrumb: boolean;
    orgBreadcrumbClass: string;
    collectionBreadcrumbClass: string;
    onToggleSidebar: () => void;
  } = $props();
</script>

<header id="page-header" class="sticky top-0 z-[60] w-full">
  <div class={cn(workspaceChromeRowClass, "min-w-0 gap-3")}>
    <button
      type="button"
      data-slot="sidebar-trigger"
      class="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-app-muted transition hover:bg-app-surface-muted hover:text-app-fg"
      aria-label="Alternar navegação"
      onclick={onToggleSidebar}
    >
      <PanelLeft class="h-4 w-4" />
    </button>

    <nav class="flex min-h-0 min-w-0 flex-1 items-center" aria-label="Breadcrumb">
      <ol class="flex min-w-0 flex-1 flex-nowrap items-center gap-3">
        {#if showSubscriptionPendingChrome}
          <li class="min-w-0">
            <div
              data-testid="workspace-loading-breadcrumb"
              class={cn(
                workspaceTopBarControlClass,
                "w-[min(44vw,12rem)] animate-pulse bg-app-surface-muted"
              )}
              aria-hidden="true"
            ></div>
          </li>
          {#if showAnaliseListingBreadcrumb}
            <li class="text-app-subtle" aria-hidden="true">
              <span class="text-sm leading-none">/</span>
            </li>
            <li class="min-w-0 flex-1">
              <div
                class={cn(
                  workspaceTopBarControlClass,
                  "w-full max-w-[18rem] animate-pulse bg-app-surface-muted"
                )}
                aria-hidden="true"
              ></div>
            </li>
          {/if}
        {:else}
          {#if showOrgBreadcrumb}
            <li class="min-w-0">
              <OrganizationSwitcher breadcrumb class={orgBreadcrumbClass} />
            </li>
            <li class="text-app-subtle" aria-hidden="true">
              <span class="text-sm leading-none">/</span>
            </li>
          {/if}
          <li class="min-w-0">
            <CollectionBreadcrumb class={collectionBreadcrumbClass} />
          </li>
          {#if showAnaliseListingBreadcrumb}
            <li class="text-app-subtle" aria-hidden="true">
              <span class="text-sm leading-none">/</span>
            </li>
            <li class="min-w-0 flex-1">
              <AnaliseListingBreadcrumb class="w-full max-w-full" />
            </li>
          {/if}
        {/if}
      </ol>
    </nav>
  </div>
</header>
