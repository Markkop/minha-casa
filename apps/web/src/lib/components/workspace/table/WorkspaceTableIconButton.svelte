<script lang="ts">
  import Button from "$lib/components/ui/Button.svelte";
  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";

  let {
    children,
    class: className = "",
    disabled = false,
    title,
    ariaLabel,
    onclick
  }: {
    children?: Snippet;
    class?: string;
    disabled?: boolean;
    title?: string;
    ariaLabel?: string;
    onclick?: (event: MouseEvent) => void;
  } = $props();
</script>

<Button
  variant="outline"
  size="icon"
  class={cn("h-8 w-8 shrink-0", className)}
  {disabled}
  {title}
  ariaLabel={ariaLabel}
  onclick={onclick}
>
  {@render children?.()}
</Button>
