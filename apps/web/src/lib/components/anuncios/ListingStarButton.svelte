<script lang="ts">
  import { Star } from "@lucide/svelte";
  import { cn } from "$lib/utils";
  import {
    LISTING_MOBILE_ICON_BTN_CLASS,
    LISTING_MOBILE_ICON_CLASS
  } from "$lib/components/anuncios/listings-table-shared";
  import FloatingTooltip from "$lib/components/ui/FloatingTooltip.svelte";

  let {
    starred = false,
    onToggle,
    variant = "default"
  } = $props<{
    starred?: boolean;
    onToggle: () => void;
    variant?: "default" | "on-media";
  }>();
</script>

<FloatingTooltip label={starred ? "Remover dos favoritos" : "Adicionar aos favoritos"} side="bottom">
  <button
    type="button"
    data-testid="listing-star-button"
    onclick={() => void onToggle()}
    class={cn(
      variant === "on-media" ? LISTING_MOBILE_ICON_BTN_CLASS : "flex-shrink-0 p-1",
      "transition-colors",
      variant === "on-media"
        ? starred
          ? "text-yellow hover:text-yellow/80"
          : "text-white/85 hover:text-yellow"
        : starred
          ? "text-yellow hover:text-yellow/80"
          : "text-muted-foreground hover:text-yellow"
    )}
  >
    <Star
      class={cn(variant === "on-media" ? LISTING_MOBILE_ICON_CLASS : "h-4 w-4", starred && variant === "on-media" && "fill-current")}
      fill={starred ? "currentColor" : "none"}
      strokeWidth={variant === "on-media" ? 1.5 : undefined}
    />
  </button>
</FloatingTooltip>
