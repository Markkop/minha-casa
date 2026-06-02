<script lang="ts">
  import FloatingTooltip from "$lib/components/ui/FloatingTooltip.svelte";
  import { cn } from "$lib/utils";

  type Variant = "primary" | "default" | "secondary" | "outline" | "ghost" | "danger" | "destructive" | "link";
  type Size = "sm" | "md" | "lg" | "icon";
  let {
    children,
    class: className = "",
    variant = "primary",
    size = "md",
    type = "button",
    disabled = false,
    title,
    ariaLabel,
    onclick
  } = $props<{
    children?: import("svelte").Snippet;
    class?: string;
    variant?: Variant;
    size?: Size;
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
    title?: string;
    ariaLabel?: string;
    onclick?: (event: MouseEvent) => void;
  }>();

  const variants: Record<Variant, string> = {
    default: "bg-primary text-primary-foreground hover:bg-[#7ec4f8]",
    primary: "bg-primary text-primary-foreground hover:bg-[#7ec4f8]",
    secondary: "border border-border bg-card text-foreground shadow-sm hover:bg-muted",
    outline: "border border-border bg-background text-foreground shadow-sm hover:bg-muted",
    ghost: "text-foreground hover:bg-muted",
    danger: "bg-destructive text-white shadow-sm hover:brightness-95",
    destructive: "bg-destructive text-white shadow-sm hover:brightness-95",
    link: "h-auto px-0 text-app-fg underline-offset-4 hover:underline"
  };

  const sizes: Record<Size, string> = {
    sm: "h-8 rounded-md px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-11 rounded-md px-8 text-sm",
    icon: "h-9 w-9 px-0"
  };
</script>

{#snippet button()}
  <button
    {type}
    {disabled}
    aria-label={ariaLabel ?? title}
    class={cn(
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-action disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0",
      variants[variant as Variant],
      sizes[size as Size],
      className
    )}
    onclick={onclick}
  >
    {@render children?.()}
  </button>
{/snippet}

{#if title}
  <FloatingTooltip label={title} side="bottom">
    {@render button()}
  </FloatingTooltip>
{:else}
  {@render button()}
{/if}
