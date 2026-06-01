<script lang="ts">
  import type { Snippet } from "svelte";
  import {
    WORKSPACE_CONTENT_CLASS,
    WORKSPACE_MAX_WIDTH_CLASS,
    workspacePageToolbarRowClass
  } from "$lib/workspace-chrome";
  import { cn } from "$lib/utils";

  let {
    toolbar,
    children,
    class: className = "",
    contentClassName = ""
  }: {
    toolbar?: Snippet;
    children: Snippet;
    class?: string;
    contentClassName?: string;
  } = $props();
</script>

<main
  class={cn("min-h-[calc(100vh-var(--nav-height,2.75rem))] bg-app-bg text-app-fg", className)}
>
  {#if toolbar}
    <header class="w-full">
      <div
        class={cn(
          "mx-auto justify-between",
          workspacePageToolbarRowClass,
          WORKSPACE_MAX_WIDTH_CLASS
        )}
      >
        {@render toolbar()}
      </div>
    </header>
  {/if}
  <div class={cn(WORKSPACE_CONTENT_CLASS, contentClassName)}>
    {@render children()}
  </div>
</main>
