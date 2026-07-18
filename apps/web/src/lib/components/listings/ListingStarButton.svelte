<script lang="ts">
  import { Star } from "@lucide/svelte";
  import { cn } from "$lib/utils";
  import {
    LISTING_MOBILE_ICON_BTN_CLASS,
    LISTING_MOBILE_ICON_CLASS
  } from "$lib/components/listings/listings-table-shared";
  import FloatingTooltip from "$lib/components/ui/FloatingTooltip.svelte";

  let {
    starred = false,
    onToggle,
    variant = "default",
    class: className = "",
    iconClass: iconClassName = ""
  } = $props<{
    starred?: boolean;
    onToggle: () => void;
    variant?: "default" | "on-media" | "floating";
    class?: string;
    iconClass?: string;
  }>();
</script>

<FloatingTooltip label={starred ? "Remover dos favoritos" : "Adicionar aos favoritos"} side="bottom">
  <button
    type="button"
    data-testid="listing-star-button"
    onclick={() => void onToggle()}
    class={cn(
      variant === "floating"
        ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-md"
        : variant === "on-media"
          ? LISTING_MOBILE_ICON_BTN_CLASS
          : "flex-shrink-0 p-1",
      "transition-colors",
      variant === "floating"
        ? starred
          ? "text-yellow hover:text-yellow/90"
          : "text-app-muted hover:text-yellow"
        : variant === "on-media"
          ? starred
            ? "text-yellow hover:text-yellow/80"
            : "text-white/85 hover:text-yellow"
          : starred
            ? "text-yellow hover:text-yellow/80"
            : "text-muted-foreground hover:text-yellow",
      className
    )}
  >
    <Star
      class={cn(
        iconClassName ||
          (variant === "floating"
            ? "h-4 w-4"
            : variant === "on-media"
              ? LISTING_MOBILE_ICON_CLASS
              : "h-4 w-4"),
        starred && "fill-current"
      )}
      fill={starred ? "currentColor" : "none"}
      strokeWidth={variant === "on-media" || variant === "floating" ? 1.5 : undefined}
    />
  </button>
</FloatingTooltip>
