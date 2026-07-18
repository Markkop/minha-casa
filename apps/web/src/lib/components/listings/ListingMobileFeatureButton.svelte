<script lang="ts">
  import type { ListingMobileFeatureItem } from "$lib/components/listings/listing-mobile-features";
  import { LISTING_MOBILE_ICON_CLASS } from "$lib/components/listings/listings-table-shared";
  import { cn } from "$lib/utils";

  let {
    feature,
    strikethrough = false,
    class: className = ""
  }: {
    feature: ListingMobileFeatureItem;
    strikethrough?: boolean;
    class?: string;
  } = $props();
</script>

<span
  class={cn(
    "inline-flex items-center gap-1 leading-none",
    strikethrough && "opacity-50",
    className
  )}
>
  <feature.Icon class={cn(LISTING_MOBILE_ICON_CLASS, feature.iconClass)} />
  <span class="text-xs text-app-fg">{feature.label}</span>
</span>
