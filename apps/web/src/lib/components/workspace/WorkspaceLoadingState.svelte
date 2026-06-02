<script lang="ts">
  import { Loader2 } from "@lucide/svelte";
  import { cn } from "$lib/utils";

  let { class: className = "" }: { class?: string } = $props();
</script>

<div
  class={cn(
    "flex min-h-[calc(100vh-var(--nav-height,2.75rem))] items-center justify-center bg-app-bg text-app-muted",
    className
  )}
  role="status"
  aria-live="polite"
  aria-label="Carregando"
>
  <Loader2 class="size-8 animate-spin text-app-accent" />
</div>
