<script lang="ts">
  import { Home } from "@lucide/svelte";
  import { cn } from "$lib/utils";
  import { workspaceHeaderControlClass } from "$lib/workspace-chrome";

  let {
    href,
    class: className = "",
    onclick
  }: {
    href: string;
    class?: string;
    onclick?: (event: MouseEvent) => void;
  } = $props();
</script>

<a
  {href}
  class={cn(
    workspaceHeaderControlClass,
    "rounded-md px-0 font-semibold text-app-fg hover:text-app-fg",
    className
  )}
  {onclick}
>
  <span
    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-app-action text-app-action-foreground"
  >
    <Home class="h-4 w-4" />
  </span>
  <span class="truncate">Minha Casa</span>
</a>
