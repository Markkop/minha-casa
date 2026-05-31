<script lang="ts">
  let {
    title,
    description,
    status,
    children
  } = $props<{
    title: string;
    description?: string;
    status?: string;
    children?: import("svelte").Snippet;
  }>();
</script>

<svelte:head>
  <title>{title} | Minha Casa</title>
</svelte:head>

<section class="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
  <div class="flex flex-col gap-2 border-b border-app-border pb-5">
    {#if status}
      <div class="text-xs font-medium uppercase tracking-wide text-app-muted">{status}</div>
    {/if}
    <h1 class="text-2xl font-semibold text-app-fg">{title}</h1>
    {#if description}
      <p class="max-w-3xl text-sm leading-6 text-app-muted">{description}</p>
    {/if}
  </div>

  {@render children?.()}
</section>
