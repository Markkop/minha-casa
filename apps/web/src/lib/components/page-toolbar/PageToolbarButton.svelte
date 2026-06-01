<script lang="ts">
  import { cn } from "$lib/utils";

  type Variant = "primary" | "secondary" | "destructive" | "ghost" | "active";

  let {
    variant = "secondary",
    class: className = "",
    disabled = false,
    type = "button",
    title = undefined,
    "aria-label": ariaLabel = undefined,
    "aria-pressed": ariaPressed = undefined,
    onclick,
    children
  } = $props<{
    variant?: Variant;
    class?: string;
    disabled?: boolean;
    type?: "button" | "submit";
    title?: string;
    "aria-label"?: string;
    "aria-pressed"?: boolean;
    onclick?: (event: MouseEvent) => void;
    children?: import("svelte").Snippet;
  }>();

  const variants: Record<Variant, string> = {
    primary: "bg-app-action text-app-action-foreground hover:bg-app-action-hover",
    secondary:
      "border border-app-border bg-app-surface text-app-fg hover:border-app-border-strong hover:bg-app-bg",
    destructive:
      "border border-app-border bg-app-surface text-app-fg hover:border-destructive hover:text-destructive",
    ghost: "text-app-muted hover:bg-app-bg hover:text-app-fg",
    active: "border border-app-action bg-app-action text-app-action-foreground"
  };
</script>

<button
  {type}
  {disabled}
  {title}
  aria-label={ariaLabel}
  aria-pressed={ariaPressed}
  {onclick}
  class={cn(
    "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0 h-7 px-2.5",
    variants[variant as Variant],
    className
  )}
>
  {@render children?.()}
</button>
