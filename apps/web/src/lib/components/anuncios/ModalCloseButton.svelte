<script lang="ts">
  import { X } from "@lucide/svelte";
  import { cn } from "$lib/utils";

  let { onclick, class: className = "" } = $props<{
    onclick?: () => void;
    class?: string;
  }>();
</script>

<button
  type="button"
  {onclick}
  class={cn("text-muted-foreground transition-colors hover:text-app-fg", className)}
  aria-label="Fechar"
>
  <X class="h-5 w-5" />
</button>
