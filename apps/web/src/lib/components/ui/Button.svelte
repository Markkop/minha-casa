<script lang="ts">
  import { cn } from "$lib/utils";

  type Variant = "primary" | "secondary" | "ghost" | "danger";
  let {
    children,
    class: className = "",
    variant = "primary",
    type = "button",
    disabled = false,
    title,
    ariaLabel,
    onclick
  } = $props<{
    children?: import("svelte").Snippet;
    class?: string;
    variant?: Variant;
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
    title?: string;
    ariaLabel?: string;
    onclick?: (event: MouseEvent) => void;
  }>();

  const variants: Record<Variant, string> = {
    primary: "bg-primary text-primary-foreground hover:bg-[#7ec4f8]",
    secondary: "border border-border bg-card text-foreground hover:bg-muted",
    ghost: "text-foreground hover:bg-muted",
    danger: "bg-destructive text-white hover:brightness-95"
  };
</script>

<button
  {type}
  {disabled}
  {title}
  aria-label={ariaLabel}
  class={cn(
    "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-60",
    variants[variant as Variant],
    className
  )}
  {onclick}
>
  {@render children?.()}
</button>
