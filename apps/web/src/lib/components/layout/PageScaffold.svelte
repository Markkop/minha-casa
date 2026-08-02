<script lang="ts">
  import { WORKSPACE_CONTENT_CLASS, WORKSPACE_STACK_CLASS } from "$lib/workspace-chrome";

  let {
    title,
    description,
    status,
    children
  } = $props<{
    title?: string;
    description?: string;
    status?: string;
    children?: import("svelte").Snippet;
  }>();
</script>

<svelte:head>
  {#if title}
    <title>{title} | Prisma</title>
  {/if}
</svelte:head>

<main class="min-h-[calc(100vh-var(--nav-height,2.75rem))] bg-app-bg text-app-fg">
  <div class={WORKSPACE_CONTENT_CLASS}>
    <div class={WORKSPACE_STACK_CLASS}>
      {#if title || description || status}
        <div class="app-panel-surface rounded-lg border border-app-border px-4 py-3">
          {#if status}
            <div class="text-xs font-medium uppercase tracking-wide text-app-muted">{status}</div>
          {/if}
          {#if title}
            <h1 class="text-lg font-semibold text-app-fg">{title}</h1>
          {/if}
          {#if description}
            <p class="mt-1 max-w-3xl text-sm leading-6 text-app-muted">{description}</p>
          {/if}
        </div>
      {/if}

      {@render children?.()}
    </div>
  </div>
</main>
