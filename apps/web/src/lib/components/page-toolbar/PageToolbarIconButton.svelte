<script lang="ts">
  import { cn } from "$lib/utils";
  import PageToolbarButton from "./PageToolbarButton.svelte";

  let {
    variant = "secondary",
    class: className = "",
    disabled = false,
    tooltipDisabled = false,
    title = undefined,
    "aria-label": ariaLabel = undefined,
    "aria-pressed": ariaPressed = undefined,
    onclick,
    children
  } = $props<{
    variant?: "primary" | "secondary" | "destructive" | "ghost" | "active";
    class?: string;
    disabled?: boolean;
    tooltipDisabled?: boolean;
    title?: string;
    "aria-label"?: string;
    "aria-pressed"?: boolean;
    onclick?: (event: MouseEvent) => void;
    children?: import("svelte").Snippet;
  }>();
</script>

<PageToolbarButton
  {variant}
  class={cn("h-7 w-7 p-0", className)}
  {disabled}
  {tooltipDisabled}
  {title}
  aria-label={ariaLabel}
  aria-pressed={ariaPressed}
  onclick={onclick}
>
  {@render children?.()}
</PageToolbarButton>
