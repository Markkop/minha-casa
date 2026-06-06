<script lang="ts">
  import type { Snippet } from "svelte";
  import type { Action } from "svelte/action";
  import { getWorkspaceRightSidebarContext } from "$lib/workspace-right-sidebar.svelte";

  let {
    title,
    children
  }: {
    title: string;
    children: Snippet;
  } = $props();

  const sidebar = getWorkspaceRightSidebarContext();

  const portalToSidebar: Action<HTMLElement, HTMLElement | null> = (node, initialTarget) => {
    function moveToTarget(target: HTMLElement | null) {
      if (target && node.parentNode !== target) {
        target.appendChild(node);
      }
    }

    moveToTarget(initialTarget);
    return {
      update: moveToTarget,
      destroy() {
        node.remove();
      }
    };
  };

  $effect(() => sidebar.register({ title }));
</script>

<div
  use:portalToSidebar={sidebar.contentTarget}
  class:hidden={!sidebar.contentTarget}
  class="min-w-0"
>
  {@render children()}
</div>
